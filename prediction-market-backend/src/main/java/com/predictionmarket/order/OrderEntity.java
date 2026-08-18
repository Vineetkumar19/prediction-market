package com.predictionmarket.order;

import com.predictionmarket.common.Enums.OrderStatus;
import com.predictionmarket.common.Enums.Side;
import jakarta.persistence.*;

import java.time.Instant;

/**
 * One user's entry on one question.
 *
 * Three share counts, not one (spec section 11):
 *   requestedShares - what the user asked for
 *   matchedShares   - what actually found an opponent
 *   remainingShares - still waiting; refunded at the deadline
 *
 * `releasedAmount` tracks how much of `totalDebit` has already left the
 * wallet's `locked` bucket - whether it went back to the user as a refund or
 * was consumed by the simulation at settlement. It exists so that settlement
 * can release exactly what is left and never leave a stray token stuck in
 * `locked` forever:
 *
 *     still locked for this order = totalDebit - releasedAmount
 *
 * Without this the 10% charge on matched shares would sit in `locked` for the
 * rest of time, because settlement only knows about the stake.
 */
@Entity
@Table(name = "orders", indexes = {
        @Index(name = "ix_orders_contest", columnList = "contest_id"),
        @Index(name = "ix_orders_user", columnList = "user_id"),
        @Index(name = "ix_orders_open", columnList = "contest_id, side, remaining_shares")
})
public class OrderEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "contest_id", nullable = false)
    private Long contestId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 4)
    private Side side;

    @Column(name = "requested_shares", nullable = false)
    private int requestedShares;

    @Column(name = "matched_shares", nullable = false)
    private int matchedShares = 0;

    @Column(name = "remaining_shares", nullable = false)
    private int remainingShares;

    @Column(name = "share_price", nullable = false)
    private long sharePrice;

    @Column(name = "base_amount", nullable = false)
    private long baseAmount;

    @Column(nullable = false)
    private long charge;

    @Column(name = "total_debit", nullable = false)
    private long totalDebit;

    /** How much of totalDebit has already left the locked bucket. Starts at 0. */
    @Column(name = "released_amount", nullable = false)
    private long releasedAmount = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OrderStatus status = OrderStatus.PENDING;

    /**
     * What settlement paid back on the matched shares - stake included, so this
     * is a return and not a profit. Null until the question is settled.
     */
    @Column(name = "settlement_return")
    private Long settlementReturn;

    /**
     * settlementReturn minus what the matched shares cost. Signed: positive is
     * profit, negative is loss, zero is a flat result. Stored rather than
     * recomputed so the history screen still shows the right number if the
     * charge rate is ever changed later.
     */
    @Column(name = "pnl")
    private Long pnl;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected OrderEntity() {
    }

    public OrderEntity(Long contestId, Long userId, Side side, int requestedShares,
                       long sharePrice, long baseAmount, long charge, long totalDebit) {
        this.contestId = contestId;
        this.userId = userId;
        this.side = side;
        this.requestedShares = requestedShares;
        this.remainingShares = requestedShares;
        this.matchedShares = 0;
        this.sharePrice = sharePrice;
        this.baseAmount = baseAmount;
        this.charge = charge;
        this.totalDebit = totalDebit;
        this.releasedAmount = 0;
        this.status = OrderStatus.PENDING;
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public Long getContestId() {
        return contestId;
    }

    public Long getUserId() {
        return userId;
    }

    public Side getSide() {
        return side;
    }

    public int getRequestedShares() {
        return requestedShares;
    }

    public int getMatchedShares() {
        return matchedShares;
    }

    public int getRemainingShares() {
        return remainingShares;
    }

    public long getSharePrice() {
        return sharePrice;
    }

    public long getBaseAmount() {
        return baseAmount;
    }

    public long getCharge() {
        return charge;
    }

    public long getTotalDebit() {
        return totalDebit;
    }

    public long getReleasedAmount() {
        return releasedAmount;
    }

    public OrderStatus getStatus() {
        return status;
    }

    public Long getSettlementReturn() {
        return settlementReturn;
    }

    public Long getPnl() {
        return pnl;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setStatus(OrderStatus status) {
        this.status = status;
    }

    /**
     * Records the outcome of settlement on this order and picks the status from
     * the P&L, so the status can never disagree with the number beside it.
     */
    public void recordSettlement(long settlementReturn, long pnl) {
        this.settlementReturn = settlementReturn;
        this.pnl = pnl;
        if (pnl > 0) {
            this.status = OrderStatus.SETTLED_PROFIT;
        } else if (pnl < 0) {
            this.status = OrderStatus.SETTLED_LOSS;
        } else {
            this.status = OrderStatus.SETTLED_FLAT;
        }
    }

    /** Tokens still sitting in the wallet's locked bucket because of this order. */
    public long stillLocked() {
        return totalDebit - releasedAmount;
    }

    /** Move `shares` from remaining to matched. */
    public void fill(int shares) {
        if (shares <= 0 || shares > remainingShares) {
            throw new IllegalArgumentException("Cannot fill " + shares + " of " + remainingShares);
        }
        this.matchedShares += shares;
        this.remainingShares -= shares;
    }

    public void recordRelease(long amount) {
        this.releasedAmount += amount;
    }

    public void clearRemaining() {
        this.remainingShares = 0;
    }

    /** Keeps the status in step with the share counts after a fill. */
    public void refreshStatus() {
        if (matchedShares == 0) {
            this.status = OrderStatus.PENDING;
        } else if (remainingShares == 0) {
            this.status = OrderStatus.FULLY_MATCHED;
        } else {
            this.status = OrderStatus.PARTIALLY_MATCHED;
        }
    }
}
