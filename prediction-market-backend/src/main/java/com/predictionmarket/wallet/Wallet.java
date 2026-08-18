package com.predictionmarket.wallet;

import jakarta.persistence.*;

/**
 * One row per user holding their virtual token balance.
 *
 * `available` is spendable. `locked` is committed to a question and cannot be
 * spent again - that is the whole point of splitting the two.
 *
 * Every write to this row happens inside a transaction that has already taken
 * a SELECT ... FOR UPDATE lock on it (see WalletRepository.lockByUserId), so
 * two simultaneous orders from the same user can never both read the same
 * starting balance and both spend it.
 */
@Entity
@Table(name = "wallets", uniqueConstraints = @UniqueConstraint(name = "uk_wallets_user", columnNames = "user_id"))
public class Wallet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false)
    private long available = 0;

    @Column(nullable = false)
    private long locked = 0;

    protected Wallet() {
    }

    public Wallet(Long userId) {
        this.userId = userId;
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public long getAvailable() {
        return available;
    }

    public long getLocked() {
        return locked;
    }

    public long getTotal() {
        return available + locked;
    }

    /* ---- the only four ways a balance may move ------------------------- */

    /** Admin credit, refunds, winnings. */
    public void credit(long amount) {
        if (amount < 0) {
            throw new IllegalArgumentException("credit() needs a positive amount");
        }
        this.available += amount;
    }

    /** Admin debit. Never used for entries - those use lock(). */
    public void debit(long amount) {
        if (amount < 0) {
            throw new IllegalArgumentException("debit() needs a positive amount");
        }
        this.available -= amount;
    }

    /** Placing an entry: tokens leave `available` and sit in `locked`. */
    public void lock(long amount) {
        this.available -= amount;
        this.locked += amount;
    }

    /** A refund: tokens come out of `locked` and become spendable again. */
    public void releaseToAvailable(long amount) {
        requireLocked(amount);
        this.locked -= amount;
        this.available += amount;
    }

    /**
     * Settlement: tokens leave `locked` and do NOT come back. Used for the
     * loser's stake and for both sides' simulated charge.
     */
    public void consumeLocked(long amount) {
        requireLocked(amount);
        this.locked -= amount;
    }

    /**
     * Nothing may take more out of `locked` than is actually in there.
     *
     * Every caller already checks, so this should never fire. It is here so
     * that if some future change does break the invariant, the transaction
     * rolls back loudly instead of quietly leaving a wallet with a negative
     * locked balance that nobody notices for weeks.
     */
    private void requireLocked(long amount) {
        if (amount < 0) {
            throw new IllegalArgumentException("Cannot release a negative amount");
        }
        if (amount > locked) {
            throw new IllegalStateException(
                    "Tried to release " + amount + " from locked but only " + locked + " is locked");
        }
    }
}
