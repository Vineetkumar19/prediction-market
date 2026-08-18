package com.predictionmarket.contest;

import com.predictionmarket.common.Enums.ContestStatus;
import com.predictionmarket.common.Enums.Side;
import jakarta.persistence.*;

import java.time.Instant;

/**
 * One question inside an event: "Will Jos Buttler score more than 50?".
 *
 * The UI calls this a "question"; the table and the API keep the spec's word
 * "contest". Only the wording differs.
 *
 * THE SHARE PRICE IS ALSO THE LINE.
 * There is deliberately no separate "target value" column any more. A question
 * priced at 50 tokens *is* the question "more or less than 50?", so storing the
 * target separately only created a way for the two to disagree. The BUY and
 * SELL descriptions are derived from the price at render time for the same
 * reason - see ContestMapper.
 *
 * `finalValue` is null until the admin declares the real number after the
 * match. Once set, every matched share is revalued to it.
 */
@Entity
@Table(name = "contests", indexes = {
        @Index(name = "ix_contests_event", columnList = "event_id"),
        @Index(name = "ix_contests_status", columnList = "status")
})
public class Contest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false)
    private Long eventId;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(nullable = false, length = 500)
    private String question;

    @Column(name = "image_url", length = 1000)
    private String imageUrl;

    /**
     * Tokens per share, and the line the question is asking about.
     * Fixed for the whole life of the contest. Both sides pay it.
     */
    @Column(name = "share_price", nullable = false)
    private long sharePrice;

    @Column(name = "start_time")
    private Instant startTime;

    /** After this moment no new entries are accepted and unmatched shares go back. */
    @Column(name = "matching_deadline")
    private Instant matchingDeadline;

    @Column(name = "end_time")
    private Instant endTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private ContestStatus status = ContestStatus.DRAFT;

    /**
     * The number the admin declares after the match - runs scored, wickets
     * taken, whatever the question asked. Null until settlement.
     */
    @Column(name = "final_value")
    private Long finalValue;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected Contest() {
    }

    public Contest(Long eventId, String title, String question, String imageUrl, long sharePrice,
                   Instant startTime, Instant matchingDeadline, Instant endTime, ContestStatus status) {
        this.eventId = eventId;
        this.title = title;
        this.question = question;
        this.imageUrl = imageUrl;
        this.sharePrice = sharePrice;
        this.startTime = startTime;
        this.matchingDeadline = matchingDeadline;
        this.endTime = endTime;
        this.status = status;
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public Long getEventId() {
        return eventId;
    }

    public String getTitle() {
        return title;
    }

    public String getQuestion() {
        return question;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public long getSharePrice() {
        return sharePrice;
    }

    public Instant getStartTime() {
        return startTime;
    }

    public Instant getMatchingDeadline() {
        return matchingDeadline;
    }

    public Instant getEndTime() {
        return endTime;
    }

    public ContestStatus getStatus() {
        return status;
    }

    public Long getFinalValue() {
        return finalValue;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setStatus(ContestStatus status) {
        this.status = status;
    }

    public void setFinalValue(Long finalValue) {
        this.finalValue = finalValue;
    }

    /**
     * Which side came out ahead, for badges and filters only.
     *
     * Null while unsettled AND null when the final value landed exactly on the
     * price - that is a genuine draw where both sides get their stake back, and
     * calling it a BUY or a SELL win would be a lie.
     */
    public Side getResult() {
        if (finalValue == null || finalValue == sharePrice) {
            return null;
        }
        return finalValue > sharePrice ? Side.YES : Side.NO;
    }

    /** True once the matching deadline has passed. */
    public boolean deadlinePassed() {
        return matchingDeadline != null && matchingDeadline.isBefore(Instant.now());
    }

    /** A player may enter only while the question is open and before the deadline. */
    public boolean acceptsEntries() {
        return status.isJoinable() && !deadlinePassed();
    }
}
