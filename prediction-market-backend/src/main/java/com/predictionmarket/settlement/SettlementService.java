package com.predictionmarket.settlement;

import com.predictionmarket.audit.AuditService;
import com.predictionmarket.common.ApiException;
import com.predictionmarket.common.BusinessRules;
import com.predictionmarket.common.Enums.ContestStatus;
import com.predictionmarket.common.Enums.Side;
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
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

/**
 * Settlement (spec section 16).
 *
 * THE PAYOUT RULE
 * ---------------
 * Nobody wins or loses outright. The admin declares the number that actually
 * happened in the match and every matched share is revalued to it, exactly the
 * way a share is revalued when a price moves.
 *
 *   BUY  return per share = clamp(finalValue, 0, 2 x sharePrice)
 *   SELL return per share = 2 x sharePrice - the above
 *
 * Worked through with a 50-token share price, one share each side, final 70:
 *
 *   A pays 55 (50 stake + 5 charge)         B pays 55
 *   A bought -> gets 70 back                B sold -> gets 30 back
 *   A is +15 on the day, B is -25, and the system absorbed the two 5s
 *   (on the position itself A is +20 and B is -20 - the charge is separate)
 *
 * The clamp is not a design preference, it is the collateral: each side only
 * staked `sharePrice` per share, so that is the most either side can pay out.
 * See BusinessRules for the full table.
 *
 * Tokens are conserved: each matched pair returns exactly 2 x sharePrice, which
 * is exactly what the pair staked. Everything that leaves a wallet either lands
 * in another wallet or is accounted for as collected charge. SettlementTest
 * asserts exactly that.
 *
 * IDEMPOTENCY
 * -----------
 * Three separate guards, because paying everyone twice is the worst thing this
 * codebase could do:
 *   1. the caller holds a PESSIMISTIC_WRITE lock on the contest row
 *   2. the status check below rejects anything already settled or cancelled
 *   3. settlements.contest_id is UNIQUE, so a duplicate INSERT fails outright
 */
@Service
public class SettlementService {

    private final ContestRepository contestRepository;
    private final OrderRepository orderRepository;
    private final WalletRepository walletRepository;
    private final WalletService walletService;
    private final SettlementRepository settlementRepository;
    private final RefundService refundService;
    private final BusinessRules rules;
    private final LiveEventPublisher publisher;
    private final AuditService auditService;

    public SettlementService(ContestRepository contestRepository,
                             OrderRepository orderRepository,
                             WalletRepository walletRepository,
                             WalletService walletService,
                             SettlementRepository settlementRepository,
                             RefundService refundService,
                             BusinessRules rules,
                             LiveEventPublisher publisher,
                             AuditService auditService) {
        this.contestRepository = contestRepository;
        this.orderRepository = orderRepository;
        this.walletRepository = walletRepository;
        this.walletService = walletService;
        this.settlementRepository = settlementRepository;
        this.refundService = refundService;
        this.rules = rules;
        this.publisher = publisher;
        this.auditService = auditService;
    }

    /**
     * Declares the final value and settles. Admin only - the caller checks that.
     *
     * @param finalValue what the player actually scored. Every matched share is
     *                   revalued to this number.
     * @param actor      the admin's User ID, for the audit trail.
     */
    @Transactional
    public Contest settle(Long contestId, long finalValue, String actor) {
        if (finalValue < 0) {
            throw ApiException.badRequest("The final value cannot be negative.");
        }

        // Row lock first: a second click, or a late order arriving at the same
        // instant, waits here and then sees the already-settled status below.
        Contest contest = contestRepository.lockById(contestId)
                .orElseThrow(() -> ApiException.notFound("Question not found."));

        if (contest.getStatus() == ContestStatus.SETTLED) {
            throw ApiException.conflict("This question is already settled.");
        }
        if (contest.getStatus() == ContestStatus.CANCELLED) {
            throw ApiException.conflict("This question was cancelled and cannot be settled.");
        }
        if (settlementRepository.existsByContestId(contestId)) {
            throw ApiException.conflict("This question is already settled.");
        }

        // Anything still waiting for an opponent goes home before we pay out.
        refundService.refundUnmatched(contest, true);

        List<OrderEntity> matched = orderRepository.lockAllForContest(contestId).stream()
                .filter(o -> o.getMatchedShares() > 0)
                .sorted(Comparator.comparing(OrderEntity::getUserId))
                .toList();

        long totalReturned = 0;
        long releasedTotal = 0;
        int matchedShares = 0;

        for (OrderEntity order : matched) {
            int shares = order.getMatchedShares();
            long price = order.getSharePrice();
            long stake = rules.baseAmount(price, shares);

            // What the position is worth now that the number is known. This
            // already includes the player's own stake - it is a return, not a
            // profit - so `returned` is exactly how much `available` goes up.
            long returned = rules.settlementReturn(order.getSide(), price, shares, finalValue);
            long pnl = returned - stake;

            // Everything this order still has locked leaves `locked` now: the
            // stake AND its share of the 10% charge. Using stillLocked() rather
            // than the stake is what stops the charge being stranded forever.
            long release = order.stillLocked();

            Wallet wallet = walletService.lock(order.getUserId());
            wallet.consumeLocked(release);
            if (returned > 0) {
                wallet.credit(returned);
            }
            walletRepository.save(wallet);

            // The ledger's rule everywhere else in this codebase is that
            // `amount` is the signed change in `available`. That holds here
            // too, including for a losing position: a loser's balance still
            // goes UP by whatever their shares turned out to be worth. The type
            // carries whether it was a good day, the note carries the maths.
            TxType type = pnl > 0 ? TxType.SETTLEMENT_PROFIT
                    : pnl < 0 ? TxType.SETTLEMENT_LOSS
                    : TxType.SETTLEMENT_FLAT;

            walletService.ledger(order.getUserId(), type, returned,
                    settlementNote(order.getSide(), shares, price, finalValue, returned, pnl),
                    contest.getId(), order.getId());

            order.recordRelease(release);
            order.recordSettlement(returned, pnl);
            orderRepository.save(order);

            totalReturned += returned;
            releasedTotal += release;
            matchedShares += shares;

            publisher.publish(order.getUserId(), WsEvent.SETTLEMENT_COMPLETED, "Settlement completed",
                    "This question settled at " + finalValue
                            + ". Your virtual token balance has been updated.",
                    contest.getId());
        }

        contest.setFinalValue(finalValue);
        contest.setStatus(ContestStatus.SETTLED);
        contestRepository.save(contest);

        // Whatever left `locked` and did not come back to somebody is the
        // simulated charge. Because every matched pair returns exactly
        // 2 x sharePrice - what the pair staked - this number is always just
        // the sum of the two 10% charges. It is the proof tokens were conserved.
        long chargeCollected = releasedTotal - totalReturned;

        settlementRepository.save(new Settlement(
                contest.getId(), finalValue, matchedShares / 2, totalReturned, chargeCollected, actor));

        auditService.record("CONTEST_RESOLVED", actor, "contest:" + contest.getId(), totalReturned,
                "finalValue=" + finalValue + " returned=" + totalReturned
                        + " charge=" + chargeCollected);

        return contest;
    }

    /** Reads back to the player as a sentence, not as a row of raw numbers. */
    private String settlementNote(Side side, int shares, long price, long finalValue,
                                  long returned, long pnl) {
        String label = side == Side.YES ? "BUY" : "SELL";
        String outcome = pnl > 0 ? "profit +" + pnl
                : pnl < 0 ? "loss " + pnl
                : "no change";
        return "Settled at " + finalValue + " - " + shares + " " + label
                + " share" + (shares == 1 ? "" : "s") + " at " + price
                + " returned " + returned + " (" + outcome + ")";
    }

    /**
     * Admin cancels a question outright. Everyone gets everything back,
     * charge included, exactly as if no opponent had ever been found.
     */
    @Transactional
    public Contest cancel(Long contestId, String actor) {
        Contest contest = contestRepository.lockById(contestId)
                .orElseThrow(() -> ApiException.notFound("Question not found."));

        if (contest.getStatus() == ContestStatus.CANCELLED) {
            throw ApiException.conflict("Already cancelled.");
        }
        if (contest.getStatus() == ContestStatus.SETTLED) {
            throw ApiException.conflict("Already settled.");
        }

        // Neutral wording: an admin may cancel a fully matched question for a
        // reason that has nothing to do with opponents. The scheduled deadline
        // job is the one that legitimately says "no opponent was found".
        long refunded = refundService.cancelContest(contest,
                "This question was cancelled by the admin. "
                        + "Your tokens have been refunded in full.");

        auditService.record("CONTEST_CANCELLED", actor, "contest:" + contest.getId(), refunded,
                "ADMIN_CANCELLED");

        return contest;
    }
}
