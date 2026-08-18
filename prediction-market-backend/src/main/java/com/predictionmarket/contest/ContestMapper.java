package com.predictionmarket.contest;

import com.predictionmarket.common.Enums.Side;
import com.predictionmarket.dto.ContestDtos.AdminContestDto;
import com.predictionmarket.dto.ContestDtos.ContestDto;
import com.predictionmarket.dto.OrderDtos.OrderDto;
import com.predictionmarket.event.EventEntity;
import com.predictionmarket.order.OrderEntity;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Turns a Contest row into the two very different shapes the API exposes.
 *
 * This class is the enforcement point for the privacy rule. `toPlayerDto` has
 * no access to anything except the caller's own orders, so it is not possible
 * to leak a market total from here even by accident. The aggregate numbers are
 * computed only in `toAdminDto`.
 */
@Component
public class ContestMapper {

    /**
     * @param myOrders ONLY the calling user's orders on this question.
     */
    public ContestDto toPlayerDto(Contest contest, EventEntity event, List<OrderEntity> myOrders) {
        int myShares = myOrders.stream().mapToInt(OrderEntity::getRequestedShares).sum();
        int myMatched = myOrders.stream().mapToInt(OrderEntity::getMatchedShares).sum();
        Side mySide = myOrders.isEmpty() ? null : myOrders.get(0).getSide();

        return new ContestDto(
                contest.getId(),
                contest.getEventId(),
                event == null ? null : event.getTitle(),
                event == null ? null : event.getLabel(),
                event == null ? "" : nullToEmpty(event.getImageUrl()),
                contest.getTitle(),
                contest.getQuestion(),
                // No fallback to the event image on purpose - see ContestDtos.
                nullToEmpty(contest.getImageUrl()),
                buyRule(contest.getSharePrice()),
                sellRule(contest.getSharePrice()),
                contest.getSharePrice(),
                contest.getSharePrice() * 2,
                contest.getStartTime(),
                contest.getMatchingDeadline(),
                contest.getEndTime(),
                contest.getStatus(),
                contest.getFinalValue(),
                contest.getResult(),
                contest.getCreatedAt(),
                myOrders.stream().map(OrderDto::of).toList(),
                myShares,
                myMatched,
                mySide);
    }

    /**
     * @param allOrders EVERY order on this question. Admin only.
     */
    public AdminContestDto toAdminDto(Contest contest, String eventTitle, List<OrderEntity> allOrders) {
        int yesShares = sum(allOrders, Side.YES, OrderEntity::getRequestedShares);
        int noShares = sum(allOrders, Side.NO, OrderEntity::getRequestedShares);
        int matched = sum(allOrders, Side.YES, OrderEntity::getMatchedShares);
        int openYes = sum(allOrders, Side.YES, OrderEntity::getRemainingShares);
        int openNo = sum(allOrders, Side.NO, OrderEntity::getRemainingShares);
        Set<Long> players = allOrders.stream().map(OrderEntity::getUserId).collect(Collectors.toSet());

        return new AdminContestDto(
                contest.getId(),
                contest.getEventId(),
                eventTitle == null ? "Unassigned" : eventTitle,
                contest.getTitle(),
                contest.getQuestion(),
                nullToEmpty(contest.getImageUrl()),
                buyRule(contest.getSharePrice()),
                sellRule(contest.getSharePrice()),
                contest.getSharePrice(),
                contest.getSharePrice() * 2,
                contest.getStartTime(),
                contest.getMatchingDeadline(),
                contest.getEndTime(),
                contest.getStatus(),
                contest.getFinalValue(),
                contest.getResult(),
                contest.getCreatedAt(),
                yesShares,
                noShares,
                matched,
                openYes,
                openNo,
                players.size());
    }

    /**
     * The BUY and SELL descriptions are generated from the price rather than
     * typed by the admin, so they cannot drift out of step with the number the
     * settlement maths uses.
     */
    private String buyRule(long sharePrice) {
        return "Final value above " + sharePrice;
    }

    private String sellRule(long sharePrice) {
        return "Final value " + sharePrice + " or below";
    }

    private int sum(List<OrderEntity> orders, Side side, java.util.function.ToIntFunction<OrderEntity> field) {
        return orders.stream().filter(o -> o.getSide() == side).mapToInt(field).sum();
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
