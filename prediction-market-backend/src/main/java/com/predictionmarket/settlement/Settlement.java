package com.predictionmarket.settlement;

import jakarta.persistence.*;

import java.time.Instant;

/**
 * One row per settled question.
 *
 * The unique constraint on contest_id is the last line of defence for
 * idempotency (spec section 16): even if two admin clicks somehow slipped past
 * the row lock on the contest, the second INSERT would fail rather than pay
 * everybody twice.
 */
@Entity
@Table(name = "settlements",
        uniqueConstraints = @UniqueConstraint(name = "uk_settlement_contest", columnNames = "contest_id"))
public class Settlement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "contest_id", nullable = false)
    private Long contestId;

    /** The number the admin declared after the match. Every share is revalued to it. */
    @Column(name = "final_value", nullable = false)
    private long finalValue;

    @Column(name = "matched_shares", nullable = false)
    private int matchedShares;

    /** Total tokens returned to players - stakes included, not just profit. */
    @Column(name = "total_payout", nullable = false)
    private long totalPayout;

    /** Sum of the 10% charges consumed by the simulation for this question. */
    @Column(name = "charge_collected", nullable = false)
    private long chargeCollected;

    @Column(name = "settled_by", length = 40)
    private String settledBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected Settlement() {
    }

    public Settlement(Long contestId, long finalValue, int matchedShares, long totalPayout,
                      long chargeCollected, String settledBy) {
        this.contestId = contestId;
        this.finalValue = finalValue;
        this.matchedShares = matchedShares;
        this.totalPayout = totalPayout;
        this.chargeCollected = chargeCollected;
        this.settledBy = settledBy;
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public Long getContestId() {
        return contestId;
    }

    public long getFinalValue() {
        return finalValue;
    }

    public int getMatchedShares() {
        return matchedShares;
    }

    public long getTotalPayout() {
        return totalPayout;
    }

    public long getChargeCollected() {
        return chargeCollected;
    }

    public String getSettledBy() {
        return settledBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
