package com.predictionmarket.wallet;

import com.predictionmarket.common.Enums.TxType;
import jakarta.persistence.*;

import java.time.Instant;

/**
 * The ledger. Every token movement in the system writes one of these, so any
 * balance can be explained line by line and audited afterwards.
 *
 * `amount` is signed: negative for money leaving the user, positive for money
 * arriving. The frontend renders the sign directly.
 */
@Entity
@Table(name = "wallet_transactions", indexes = {
        @Index(name = "ix_tx_user", columnList = "user_id"),
        @Index(name = "ix_tx_contest", columnList = "contest_id")
})
public class WalletTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TxType type;

    @Column(nullable = false)
    private long amount;

    @Column(length = 255)
    private String note;

    @Column(name = "contest_id")
    private Long contestId;

    @Column(name = "order_id")
    private Long orderId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected WalletTransaction() {
    }

    public WalletTransaction(Long userId, TxType type, long amount, String note, Long contestId, Long orderId) {
        this.userId = userId;
        this.type = type;
        this.amount = amount;
        this.note = note;
        this.contestId = contestId;
        this.orderId = orderId;
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public TxType getType() {
        return type;
    }

    public long getAmount() {
        return amount;
    }

    public String getNote() {
        return note;
    }

    public Long getContestId() {
        return contestId;
    }

    public Long getOrderId() {
        return orderId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
