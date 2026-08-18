package com.predictionmarket.settlement;

import com.predictionmarket.common.BusinessRules;
import com.predictionmarket.common.Enums.ContestStatus;
import com.predictionmarket.common.Enums.OrderStatus;
import com.predictionmarket.common.Enums.TxType;
import com.predictionmarket.common.Enums.WsEvent;
import com.predictionmarket.contest.Contest;
import com.predictionmarket.contest.ContestRepository;
import com.predictionmarket.order.OrderEntity;
import com.predictionmarket.order.OrderRepository;
import com.predictionmarket.wallet.Wallet;
import com.predictionmarket.wallet.WalletRepository;
import com.predictionmarket.wallet.WalletService;
import com.predictionmarket.websocket.LiveEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

/**
 * Giving tokens back (spec sections 10 and 11).
 *
 * Two cases, and the difference matters:
 *
 *   refundUnmatched  - some shares found an opponent, some did not. Only the
 *                      leftover shares are returned, with their share of the
 *                      10% charge. The matched shares stay in the contest.
 *
 *   cancelContest    - nobody took the other side at all. Everything comes
 *                      back, including the charge, and the question is dead.
 *
 * Both are idempotent. A refund works off `remainingShares`, which it then sets
 * to zero, so running it twice returns nothing the second time. Cancellation
 * works off `stillLocked()`, which becomes zero the same way.
 *
 * CONCURRENCY: the caller must already hold the contest row lock. Wallets are
 * then locked in ascending user id order so two of these running on different
 * questions can never deadlock against each other.
 */
@Service
public class RefundService {

    private final OrderRepository orderRepository;
    private final ContestRepository contestRepository;
    private final WalletRepository walletRepository;
    private final WalletService walletService;
    private final BusinessRules rules;
    private final LiveEventPublisher publisher;

    public RefundService(OrderRepository orderRepository,
                         ContestRepository contestRepository,
                         WalletRepository walletRepository,
                         WalletService walletService,
                         BusinessRules rules,
                         LiveEventPublisher publisher) {
        this.orderRepository = orderRepository;
        this.contestRepository = contestRepository;
        this.walletRepository = walletRepository;
        this.walletService = walletService;
        this.rules = rules;
        this.publisher = publisher;
    }

    /**
     * Returns the still-unmatched shares of every order on this question.
     *
     * @return total tokens handed back.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public long refundUnmatched(Contest contest, boolean notifyUsers) {
        List<OrderEntity> orders = orderRepository.lockAllForContest(contest.getId()).stream()
                .filter(o -> o.getRemainingShares() > 0)
                .sorted(Comparator.comparing(OrderEntity::getUserId))
                .toList();

        long total = 0;

        for (OrderEntity order : orders) {
            int unmatched = order.getRemainingShares();
            long unmatchedBase = rules.baseAmount(order.getSharePrice(), unmatched);
            long unmatchedCharge = rules.charge(unmatchedBase);
            long refund = unmatchedBase + unmatchedCharge;

            // Never hand back more than this order still has locked. Rounding
            // on the charge cannot push the total past what was taken.
            refund = Math.min(refund, order.stillLocked());

            Wallet wallet = walletService.lock(order.getUserId());
            wallet.releaseToAvailable(refund);
            walletRepository.save(wallet);

            order.recordRelease(refund);
            order.clearRemaining();
            // Not refreshStatus() here: that would see remainingShares == 0 and
            // call a 6-of-10 order FULLY_MATCHED, hiding the fact that 4 shares
            // were handed back. The status has to keep telling the truth.
            order.setStatus(order.getMatchedShares() > 0
                    ? OrderStatus.PARTIALLY_MATCHED
                    : OrderStatus.REFUNDED);
            orderRepository.save(order);

            walletService.ledger(order.getUserId(), TxType.UNMATCHED_REFUND, refund,
                    unmatched + " unmatched shares refunded", contest.getId(), order.getId());

            if (notifyUsers) {
                publisher.publish(order.getUserId(), WsEvent.UNMATCHED_REFUND,
                        "Unmatched shares refunded",
                        unmatched + (unmatched == 1 ? " share" : " shares")
                                + " could not be matched. " + refund + " tokens have been refunded.",
                        contest.getId());
            }

            total += refund;
        }

        return total;
    }

    /**
     * No opponent was found: every entry is returned in full, charge included,
     * and the question is closed for good.
     *
     * @return total tokens handed back.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public long cancelContest(Contest contest, String reasonForUser) {
        List<OrderEntity> orders = orderRepository.lockAllForContest(contest.getId()).stream()
                .sorted(Comparator.comparing(OrderEntity::getUserId))
                .toList();

        long total = 0;

        for (OrderEntity order : orders) {
            long refund = order.stillLocked();

            if (refund > 0) {
                Wallet wallet = walletService.lock(order.getUserId());
                wallet.releaseToAvailable(refund);
                walletRepository.save(wallet);

                order.recordRelease(refund);
                walletService.ledger(order.getUserId(), TxType.CONTEST_CANCEL_REFUND, refund,
                        "Opponent not found - full refund", contest.getId(), order.getId());
                total += refund;
            }

            order.clearRemaining();
            order.setStatus(OrderStatus.CANCELLED);
            orderRepository.save(order);

            publisher.publish(order.getUserId(), WsEvent.CONTEST_CANCELLED, "Contest cancelled",
                    reasonForUser, contest.getId());
        }

        contest.setStatus(ContestStatus.CANCELLED);
        contestRepository.save(contest);

        return total;
    }
}
