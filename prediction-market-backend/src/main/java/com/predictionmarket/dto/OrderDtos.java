package com.predictionmarket.dto;

import com.predictionmarket.common.Enums.ContestStatus;
import com.predictionmarket.common.Enums.OrderStatus;
import com.predictionmarket.common.Enums.Side;
import com.predictionmarket.order.OrderEntity;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

public final class OrderDtos {

    private OrderDtos() {
    }

    /**
     * What the client is allowed to ask for: a question, a side, a share count.
     *
     * It never sends an amount. The server recalculates base, charge and total
     * from its own share price (spec section 5) - a client that posts its own
     * numbers would be a way to buy 100 shares for 1 token.
     */
    public record PlaceOrderRequest(
            @NotNull(message = "Choose a question") Long contestId,
            @NotNull(message = "Choose BUY or SELL") Side side,
            @Min(value = 1, message = "Enter at least 1 share")
            @Max(value = 999, message = "That is more than the maximum of 999 shares")
            int shares) {
    }

    public record OrderDto(
            Long id,
            Long contestId,
            Long userId,
            Side side,
            int requestedShares,
            int matchedShares,
            int remainingShares,
            long sharePrice,
            long baseAmount,
            long charge,
            long totalDebit,
            OrderStatus status,
            /* Both null until the question is settled. `settlementReturn` is
               what came back including the stake; `pnl` is the signed profit. */
            Long settlementReturn,
            Long pnl,
            Instant createdAt) {

        public static OrderDto of(OrderEntity o) {
            return new OrderDto(
                    o.getId(), o.getContestId(), o.getUserId(), o.getSide(),
                    o.getRequestedShares(), o.getMatchedShares(), o.getRemainingShares(),
                    o.getSharePrice(), o.getBaseAmount(), o.getCharge(), o.getTotalDebit(),
                    o.getStatus(), o.getSettlementReturn(), o.getPnl(), o.getCreatedAt());
        }
    }

    /** Just enough of the question to label a row in the history screen. */
    public record ContestBriefDto(Long id, String title, String question, ContestStatus status,
                                  long sharePrice, Long finalValue) {
    }

    /** GET /api/orders/my - an order plus the question it belongs to. */
    public record MyOrderDto(
            Long id,
            Long contestId,
            Long userId,
            Side side,
            int requestedShares,
            int matchedShares,
            int remainingShares,
            long sharePrice,
            long baseAmount,
            long charge,
            long totalDebit,
            OrderStatus status,
            Long settlementReturn,
            Long pnl,
            Instant createdAt,
            ContestBriefDto contest,
            String eventTitle) {
    }
}
