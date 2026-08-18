package com.predictionmarket.wallet;

import com.predictionmarket.common.ApiException;
import com.predictionmarket.common.Enums.TxType;
import com.predictionmarket.common.Enums.WsEvent;
import com.predictionmarket.contest.Contest;
import com.predictionmarket.contest.ContestRepository;
import com.predictionmarket.dto.WalletDtos.AdminTransactionDto;
import com.predictionmarket.dto.WalletDtos.TransactionDto;
import com.predictionmarket.dto.WalletDtos.WalletDto;
import com.predictionmarket.audit.AuditService;
import com.predictionmarket.user.User;
import com.predictionmarket.user.UserRepository;
import com.predictionmarket.websocket.LiveEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * The only class allowed to move tokens.
 *
 * Everything that changes a balance goes through here so there is exactly one
 * place where the pessimistic wallet lock is taken and exactly one place where
 * a ledger row is written. A balance that changed without a matching
 * wallet_transactions row would be unexplainable, and the spec is explicit that
 * that must never happen.
 */
@Service
public class WalletService {

    private final WalletRepository walletRepository;
    private final WalletTransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final ContestRepository contestRepository;
    private final AuditService auditService;
    private final LiveEventPublisher publisher;

    public WalletService(WalletRepository walletRepository,
                         WalletTransactionRepository transactionRepository,
                         UserRepository userRepository,
                         ContestRepository contestRepository,
                         AuditService auditService,
                         LiveEventPublisher publisher) {
        this.walletRepository = walletRepository;
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
        this.contestRepository = contestRepository;
        this.auditService = auditService;
        this.publisher = publisher;
    }

    /* ---- reads ---------------------------------------------------------- */

    @Transactional
    public Wallet ensureWallet(Long userId) {
        return walletRepository.findByUserId(userId)
                .orElseGet(() -> walletRepository.save(new Wallet(userId)));
    }

    /**
     * The wallet row with a SELECT ... FOR UPDATE held on it.
     * Call this before any balance change; the lock is released when the
     * surrounding transaction commits.
     */
    @Transactional
    public Wallet lock(Long userId) {
        return walletRepository.lockByUserId(userId)
                .orElseGet(() -> {
                    walletRepository.save(new Wallet(userId));
                    return walletRepository.lockByUserId(userId)
                            .orElseThrow(() -> ApiException.badRequest("Wallet could not be opened."));
                });
    }

    @Transactional(readOnly = true)
    public WalletDto balanceOf(Long userId) {
        return walletRepository.findByUserId(userId)
                .map(w -> new WalletDto(w.getAvailable(), w.getLocked(), w.getTotal()))
                .orElse(new WalletDto(0, 0, 0));
    }

    @Transactional(readOnly = true)
    public List<TransactionDto> transactionsOf(Long userId) {
        List<WalletTransaction> rows = transactionRepository.findByUserIdOrderByCreatedAtDesc(userId);
        Map<Long, String> titles = contestTitles(rows);
        return rows.stream()
                .map(t -> new TransactionDto(
                        t.getId(), t.getUserId(), t.getType(), t.getAmount(), t.getNote(),
                        t.getContestId(), t.getOrderId(), t.getCreatedAt(),
                        t.getContestId() == null ? null : titles.get(t.getContestId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AdminTransactionDto> allTransactions() {
        List<WalletTransaction> rows = transactionRepository.findAllByOrderByCreatedAtDesc();
        Map<Long, String> titles = contestTitles(rows);
        Map<Long, String> handles = userRepository.findAll().stream()
                .collect(Collectors.toMap(User::getId, User::getUserId));

        return rows.stream()
                .map(t -> new AdminTransactionDto(
                        t.getId(), t.getUserId(), t.getType(), t.getAmount(), t.getNote(),
                        t.getContestId(), t.getOrderId(), t.getCreatedAt(),
                        t.getContestId() == null ? null : titles.get(t.getContestId()),
                        handles.getOrDefault(t.getUserId(), String.valueOf(t.getUserId()))))
                .toList();
    }

    /* ---- writes --------------------------------------------------------- */

    /** Records a ledger line. Always called next to the balance change itself. */
    @Transactional
    public void ledger(Long userId, TxType type, long amount, String note, Long contestId, Long orderId) {
        transactionRepository.save(new WalletTransaction(userId, type, amount, note, contestId, orderId));
    }

    /**
     * Admin token allocation, spec section 14.
     * Positive credits, negative debits. A debit is refused if the user does
     * not have that much available - locked tokens are committed elsewhere and
     * are not the admin's to take back.
     */
    @Transactional
    public WalletDto adjustTokens(User admin, Long targetUserId, long amount, String reason) {
        if (amount == 0) {
            throw ApiException.badRequest("Enter a non-zero amount.");
        }

        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> ApiException.notFound("User not found."));

        Wallet wallet = lock(target.getId());

        if (amount < 0 && wallet.getAvailable() < Math.abs(amount)) {
            throw ApiException.badRequest("That user does not have enough available tokens.");
        }

        if (amount > 0) {
            wallet.credit(amount);
        } else {
            wallet.debit(Math.abs(amount));
        }
        walletRepository.save(wallet);

        String note = (reason == null || reason.isBlank()) ? "Admin adjustment" : reason;
        ledger(target.getId(), amount > 0 ? TxType.ADMIN_CREDIT : TxType.ADMIN_DEBIT, amount, note, null, null);

        auditService.record(amount > 0 ? "TOKEN_CREDIT" : "TOKEN_DEBIT",
                admin.getUserId(), target.getUserId(), amount, note);

        publisher.publish(target.getId(), WsEvent.WALLET_UPDATED,
                amount > 0 ? "Tokens added" : "Tokens adjusted",
                (amount > 0 ? "+" : "") + amount + " tokens. " + note, null);

        return new WalletDto(wallet.getAvailable(), wallet.getLocked(), wallet.getTotal());
    }

    /* ---- helpers -------------------------------------------------------- */

    private Map<Long, String> contestTitles(List<WalletTransaction> rows) {
        List<Long> ids = rows.stream()
                .map(WalletTransaction::getContestId)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        if (ids.isEmpty()) {
            return new HashMap<>();
        }
        return contestRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(Contest::getId, Contest::getTitle, (a, b) -> a));
    }

    /**
     * Net tokens the admin has put into circulation. ADMIN_DEBIT rows are
     * already stored negative, so adding them subtracts - without this the
     * dashboard tile would only ever go up, even after tokens were taken back.
     */
    public long sumIssued() {
        return transactionRepository.sumByType(TxType.ADMIN_CREDIT)
                + transactionRepository.sumByType(TxType.ADMIN_DEBIT);
    }

    public long sumLocked() {
        return walletRepository.sumLocked();
    }

    public Map<Long, Wallet> walletsByUser(List<Long> userIds) {
        return walletRepository.findByUserIdIn(userIds).stream()
                .collect(Collectors.toMap(Wallet::getUserId, Function.identity(), (a, b) -> a));
    }
}
