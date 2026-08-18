package com.predictionmarket.event;

import com.predictionmarket.common.Enums.EventStatus;
import jakarta.persistence.*;

import java.time.Instant;

/**
 * The real-world thing people are predicting about: "India vs Pakistan",
 * "NIFTY 50 weekly close".
 *
 * The home screen shows events, not questions. Each event holds many
 * questions (contests). Named EventEntity rather than Event so it does not
 * collide with Spring's own Event types in imports.
 */
@Entity
@Table(name = "events")
public class EventEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 160)
    private String title;

    /** The free-text line under the title, chosen by the admin. */
    @Column(length = 160)
    private String label;

    @Column(name = "image_url", length = 1000)
    private String imageUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private EventStatus status = EventStatus.OPEN;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected EventEntity() {
    }

    public EventEntity(String title, String label, String imageUrl) {
        this.title = title;
        this.label = label;
        this.imageUrl = imageUrl;
        this.status = EventStatus.OPEN;
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public String getLabel() {
        return label;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public EventStatus getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public void toggleStatus() {
        this.status = (this.status == EventStatus.OPEN) ? EventStatus.CLOSED : EventStatus.OPEN;
    }
}
