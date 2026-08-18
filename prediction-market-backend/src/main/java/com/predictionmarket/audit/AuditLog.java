package com.predictionmarket.audit;

import jakarta.persistence.*;

import java.time.Instant;

/**
 * Admin and important system actions (spec sections 14 and 22).
 *
 * This is where the technical reason lives. The user is told "an opponent was
 * not found, your tokens have been refunded"; the audit row keeps the blunt
 * version - OPPONENT_NOT_FOUND - for whoever has to explain it later.
 */
@Entity
@Table(name = "audit_logs", indexes = {
        @Index(name = "ix_audit_created", columnList = "created_at")
})
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** TOKEN_CREDIT, CONTEST_RESOLVED, CONTEST_CANCELLED, DEADLINE_LOCK, ... */
    @Column(nullable = false, length = 40)
    private String action;

    /** The admin's User ID, or "SYSTEM" for the scheduled deadline job. */
    @Column(length = 40)
    private String actor;

    /** The affected User ID or contest reference. */
    @Column(length = 80)
    private String target;

    private Long amount;

    @Column(length = 500)
    private String detail;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected AuditLog() {
    }

    public AuditLog(String action, String actor, String target, Long amount, String detail) {
        this.action = action;
        this.actor = actor;
        this.target = target;
        this.amount = amount;
        this.detail = detail;
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public String getAction() {
        return action;
    }

    public String getActor() {
        return actor;
    }

    public String getTarget() {
        return target;
    }

    public Long getAmount() {
        return amount;
    }

    public String getDetail() {
        return detail;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
