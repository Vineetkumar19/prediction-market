package com.predictionmarket.notification;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;

import java.time.Instant;

/**
 * A stored copy of every live message pushed over the WebSocket, so the user
 * can still read "your shares were matched" after closing the tab.
 *
 * `event` is a plain String rather than the WsEvent enum because the seed also
 * writes a WELCOME message, and future message types should not require a
 * schema change.
 */
@Entity
@Table(name = "notifications", indexes = {
        @Index(name = "ix_notifications_user", columnList = "user_id")
})
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "event_type", nullable = false, length = 40)
    private String event;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(nullable = false, length = 500)
    private String message;

    @Column(name = "contest_id")
    private Long contestId;

    /**
     * Column is is_read; the JSON field must be "read" because that is what
     * the frontend's Notifications screen looks at.
     */
    @Column(name = "is_read", nullable = false)
    private boolean read = false;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected Notification() {
    }

    public Notification(Long userId, String event, String title, String message, Long contestId) {
        this.userId = userId;
        this.event = event;
        this.title = title;
        this.message = message;
        this.contestId = contestId;
        this.read = false;
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public String getEvent() {
        return event;
    }

    public String getTitle() {
        return title;
    }

    public String getMessage() {
        return message;
    }

    public Long getContestId() {
        return contestId;
    }

    @JsonProperty("read")
    public boolean isRead() {
        return read;
    }

    public void markRead() {
        this.read = true;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
