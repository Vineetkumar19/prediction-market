package com.predictionmarket.dto;

import com.predictionmarket.common.Enums.TxType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public final class WalletDtos {

    private WalletDtos() {
    }

    /** available + locked = total. The wallet screen shows all three. */
    public record WalletDto(long available, long locked, long total) {
    }

    /**
     * One line of the ledger. `amount` is signed - negative means tokens left
     * the user - and the UI renders the sign as it comes.
     */
    public record TransactionDto(
            Long id,
            Long userId,
            TxType type,
            long amount,
            String note,
            Long contestId,
            Long orderId,
            Instant createdAt,
            String contestTitle) {
    }

    /** The admin ledger adds which user each line belongs to. */
    public record AdminTransactionDto(
            Long id,
            Long userId,
            TxType type,
            long amount,
            String note,
            Long contestId,
            Long orderId,
            Instant createdAt,
            String contestTitle,
            String user) {
    }

    /**
     * Admin token allocation (spec section 14).
     * A negative amount removes tokens; the service refuses if the user does
     * not have that many available.
     */
    public record AdjustTokensRequest(
            @NotNull(message = "Enter an amount") Long amount,
            @Size(max = 255) String reason) {
    }
}
