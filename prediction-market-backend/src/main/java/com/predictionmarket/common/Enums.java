package com.predictionmarket.common;

/**
 * Every enum the backend shares with the React frontend.
 *
 * These strings must stay byte-identical to src/utils/constants.js in the
 * frontend. If you rename one here, rename it there in the same commit -
 * there is deliberately no mapping layer between the two.
 */
public final class Enums {

    private Enums() {
    }

    /** Spring Security roles. Stored without the ROLE_ prefix; added at auth time. */
    public enum Role {
        USER,
        ADMIN
    }

    /**
     * The side of a prediction.
     * YES is shown to the user as BUY, NO is shown as SELL. The backend keeps
     * YES/NO because that is what the outcome actually is.
     */
    public enum Side {
        YES,
        NO;

        public Side opposite() {
            return this == YES ? NO : YES;
        }
    }

    /** An event is the real-world thing: "India vs Pakistan". */
    public enum EventStatus {
        OPEN,
        CLOSED
    }

    /** Contest (= one question) lifecycle, spec section 12. */
    public enum ContestStatus {
        DRAFT,
        OPEN,
        PARTIAL,
        MATCHED,
        LOCKED,
        RESOLVED,
        SETTLED,
        CANCELLED;

        /** Statuses in which a player may still place an entry. */
        public boolean isJoinable() {
            return this == OPEN || this == PARTIAL;
        }

        /** Nothing may change a question once it has reached a terminal state. */
        public boolean isTerminal() {
            return this == SETTLED || this == CANCELLED;
        }
    }

    /**
     * There is no WON or LOST any more.
     *
     * Under the point-settlement model a position does not win or lose outright
     * - it comes back worth more, less, or exactly what it cost. SETTLED_FLAT is
     * a real outcome, not a rounding artefact: it happens whenever the admin
     * declares a final value exactly equal to the share price.
     */
    public enum OrderStatus {
        PENDING,
        PARTIALLY_MATCHED,
        FULLY_MATCHED,
        REFUNDED,
        CANCELLED,
        SETTLED_PROFIT,
        SETTLED_LOSS,
        SETTLED_FLAT
    }

    /** Wallet ledger entry types, spec section 15. */
    public enum TxType {
        ADMIN_CREDIT,
        ADMIN_DEBIT,
        CONTEST_ENTRY,
        SIMULATED_CHARGE,
        MATCHED_STAKE,
        UNMATCHED_REFUND,
        CONTEST_CANCEL_REFUND,
        SETTLEMENT_PROFIT,
        SETTLEMENT_LOSS,
        SETTLEMENT_FLAT
    }

    /** WebSocket frame types, spec section 8. */
    public enum WsEvent {
        PARTIAL_MATCH,
        FULL_MATCH,
        NEW_OPPONENT_MATCHED,
        UNMATCHED_REFUND,
        CONTEST_CANCELLED,
        CONTEST_LOCKED,
        CONTEST_RESOLVED,
        SETTLEMENT_COMPLETED,
        WALLET_UPDATED,
        WELCOME
    }
}
