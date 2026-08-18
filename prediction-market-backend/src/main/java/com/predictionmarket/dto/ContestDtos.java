package com.predictionmarket.dto;

import com.predictionmarket.common.Enums.ContestStatus;
import com.predictionmarket.common.Enums.Side;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

/**
 * A contest is one question inside an event.
 *
 * THE IMPORTANT PART OF THIS FILE
 * -------------------------------
 * There are two response shapes, and the difference between them is a product
 * rule, not a UI preference:
 *
 *   ContestDto      - what a player receives. Contains this user's own position
 *                     and nothing else about anybody else.
 *   AdminContestDto - what the admin receives. Adds the market-wide totals.
 *
 * yesShares, noShares, matchedShares, openYes, openNo and players exist ONLY on
 * AdminContestDto. A player must never be able to learn which way the crowd is
 * leaning - not from the screen, and not by opening the network tab and reading
 * the JSON. That is why the split lives here in the response type rather than
 * being hidden in the React components.
 *
 * If you ever add a field, ask which of these two records it belongs on.
 */
public final class ContestDtos {

    private ContestDtos() {
    }

    /** ---- what a PLAYER sees ------------------------------------------- */
    public record ContestDto(
            Long id,
            Long eventId,
            String eventTitle,
            String eventLabel,
            String eventImageUrl,
            String title,
            String question,
            /* Empty unless the admin gave THIS question its own picture. The
               card deliberately does not fall back to the event image, or every
               question in an event would show the same photo. */
            String imageUrl,
            /* Derived from sharePrice by ContestMapper, never typed by anyone.
               "Above 50" / "50 or below". */
            String yesRule,
            String noRule,
            long sharePrice,
            /* The most a share can be worth at settlement: 2 x sharePrice. Sent
               so the entry screen can state the maximum profit and loss up
               front instead of the player discovering the cap afterwards. */
            long maxValue,
            Instant startTime,
            Instant matchingDeadline,
            Instant endTime,
            ContestStatus status,
            /* Null until settled. The number the admin declared after the match. */
            Long finalValue,
            /* Which side ended up ahead. Null while unsettled and null on an
               exact draw - see Contest.getResult(). */
            Side result,
            Instant createdAt,

            /* this user's own position - nobody else's */
            List<OrderDtos.OrderDto> myOrders,
            int myShares,
            int myMatched,
            Side mySide) {
    }

    /** ---- what the ADMIN sees ------------------------------------------ */
    public record AdminContestDto(
            Long id,
            Long eventId,
            String eventTitle,
            String title,
            String question,
            String imageUrl,
            String yesRule,
            String noRule,
            long sharePrice,
            long maxValue,
            Instant startTime,
            Instant matchingDeadline,
            Instant endTime,
            ContestStatus status,
            Long finalValue,
            Side result,
            Instant createdAt,

            /* admin-only market numbers */
            int yesShares,
            int noShares,
            int matchedShares,
            int openYes,
            int openNo,
            int players) {
    }

    /**
     * Deliberately short.
     *
     * There is no title, no target value and no BUY/SELL descriptions to type.
     * The title is taken from the question, the target IS the share price, and
     * the two descriptions are generated from that price. Every one of those
     * fields was a way for the admin to enter something that contradicted the
     * price, which is the one number the settlement maths actually uses.
     */
    public record CreateContestRequest(
            @NotNull(message = "Choose an event first") Long eventId,

            @NotBlank(message = "Enter the question")
            @Size(max = 500, message = "That question is too long")
            String question,

            @Size(max = 1000) String imageUrl,

            @Min(value = 1, message = "Share price must be at least 1 token") long sharePrice,

            Instant startTime,
            Instant matchingDeadline,
            Instant endTime,

            /** true = open it to players immediately, false = keep it as a draft. */
            boolean publish) {
    }

    /**
     * What the admin declares after the match: the actual number the player
     * scored. Not a side - the side falls out of the number.
     *
     * Negative values are rejected because no cricket statistic is negative,
     * and a stray minus sign would silently hand the SELL side the maximum.
     */
    public record ResolveRequest(
            @NotNull(message = "Enter the final value")
            @Min(value = 0, message = "The final value cannot be negative")
            Long finalValue) {
    }
}
