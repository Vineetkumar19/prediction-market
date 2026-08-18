package com.predictionmarket.matching;

import jakarta.persistence.*;

import java.time.Instant;

/**
 * One YES-vs-NO fill (spec section 17, `matches` table).
 *
 * A single order can produce several of these: 10 BUY shares matched by two
 * different SELL users of 5 each writes two rows, so every match stays
 * traceable back to the two orders that made it.
 */
@Entity
@Table(name = "matches", indexes = {
        @Index(name = "ix_matches_contest", columnList = "contest_id")
})
public class MatchRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "contest_id", nullable = false)
    private Long contestId;

    @Column(name = "yes_order_id", nullable = false)
    private Long yesOrderId;

    @Column(name = "no_order_id", nullable = false)
    private Long noOrderId;

    @Column(nullable = false)
    private int shares;

    @Column(name = "share_price", nullable = false)
    private long sharePrice;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected MatchRecord() {
    }

    public MatchRecord(Long contestId, Long yesOrderId, Long noOrderId, int shares, long sharePrice) {
        this.contestId = contestId;
        this.yesOrderId = yesOrderId;
        this.noOrderId = noOrderId;
        this.shares = shares;
        this.sharePrice = sharePrice;
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public Long getContestId() {
        return contestId;
    }

    public Long getYesOrderId() {
        return yesOrderId;
    }

    public Long getNoOrderId() {
        return noOrderId;
    }

    public int getShares() {
        return shares;
    }

    public long getSharePrice() {
        return sharePrice;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
