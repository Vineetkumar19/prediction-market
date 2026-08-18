package com.predictionmarket.order;

import com.predictionmarket.common.ApiException;
import com.predictionmarket.common.BusinessRules;
import com.predictionmarket.common.Enums.EventStatus;
import com.predictionmarket.common.Enums.TxType;
import com.predictionmarket.common.Enums.WsEvent;
import com.predictionmarket.contest.Contest;
import com.predictionmarket.contest.ContestRepository;
import com.predictionmarket.dto.OrderDtos.ContestBriefDto;
import com.predictionmarket.dto.OrderDtos.MyOrderDto;
import com.predictionmarket.dto.OrderDtos.OrderDto;
import com.predictionmarket.dto.OrderDtos.PlaceOrderRequest;
import com.predictionmarket.event.EventEntity;
import com.predictionmarket.event.EventRepository;
import com.predictionmarket.matching.MatchingEngine;
import com.predictionmarket.wallet.Wallet;
import com.predictionmarket.wallet.WalletRepository;
import com.predictionmarket.wallet.WalletService;
import com.predictionmarket.websocket.LiveEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Placing an entry - the single most important write path in the project.
 *
 * The whole thing runs in one transaction, in this order:
 *
 *   1. lock the question row      (serialises everyone entering this question)
 *   2. re-check status + deadline (a late entry cannot slip past a settle)
 *   3. recompute the cost         (the client's numbers are never trusted)
 *   4. lock the wallet row        (no two entries can spend the same tokens)
 *   5. check available balance, move tokens available -> locked
 *   6. write the order + two ledger lines
 *   7. run the matching engine
 *
 * Lock order is always contest first, then wallet. Every other service that
 * takes both locks does the same, which is what keeps deadlocks impossible.
 *
 * If any step throws, the whole thing rolls back: no half-placed order, no
 * tokens taken without an order to show for them.
 */
@Service
public class OrderService {

    private final ContestRepository contestRepository;
    private final OrderRepository orderRepository;
    private final EventRepository eventRepository;
    private final WalletRepository walletRepository;
    private final WalletService walletService;
    private final MatchingEngine matchingEngine;
    private final BusinessRules rules;
    private final LiveEventPublisher publisher;

    public OrderService(ContestRepository contestRepository,
                        OrderRepository orderRepository,
                        EventRepository eventRepository,
                        WalletRepository walletRepository,
                        WalletService walletService,
                        MatchingEngine matchingEngine,
                        BusinessRules rules,
                        LiveEventPublisher publisher) {
        this.contestRepository = contestRepository;
        this.orderRepository = orderRepository;
        this.eventRepository = eventRepository;
        this.walletRepository = walletRepository;
        this.walletService = walletService;
        this.matchingEngine = matchingEngine;
        this.rules = rules;
        this.publisher = publisher;
    }

    @Transactional
    public OrderDto place(Long userId, PlaceOrderRequest request) {

        /* 1. lock the question ------------------------------------------- */
        Contest contest = contestRepository.lockById(request.contestId())
                .orElseThrow(() -> ApiException.notFound("Question not found."));

        /* 2. is it still open? ------------------------------------------- */
        if (!contest.getStatus().isJoinable()) {
            throw ApiException.conflict("This question is no longer accepting entries.");
        }
        if (contest.deadlinePassed()) {
            throw ApiException.conflict("The deadline for this question has passed.");
        }

        // Closing an event has to stop entries on the questions inside it,
        // otherwise the admin's Close button would only change a badge.
        EventEntity event = eventRepository.findById(contest.getEventId()).orElse(null);
        if (event != null && event.getStatus() == EventStatus.CLOSED) {
            throw ApiException.conflict("This event is closed and is not accepting entries.");
        }

        int shares = request.shares();

        // One user, one side. Holding both sides of the same question would let
        // somebody match against themselves and burn only the charge.
        List<OrderEntity> existing =
                orderRepository.findByContestIdAndUserIdOrderByCreatedAtAsc(contest.getId(), userId);
        if (!existing.isEmpty() && existing.get(0).getSide() != request.side()) {
            throw ApiException.conflict("You already hold the opposite side of this question.");
        }

        /* 3. the server decides the price -------------------------------- */
        long baseAmount = rules.baseAmount(contest.getSharePrice(), shares);
        long charge = rules.charge(baseAmount);
        long totalDebit = baseAmount + charge;

        /* 4 + 5. lock the wallet and move the tokens ---------------------- */
        Wallet wallet = walletService.lock(userId);
        if (wallet.getAvailable() < totalDebit) {
            throw ApiException.badRequest("You do not have enough tokens for this entry.");
        }
        wallet.lock(totalDebit);
        walletRepository.save(wallet);

        /* 6. the order and its ledger lines ------------------------------- */
        OrderEntity order = orderRepository.save(new OrderEntity(
                contest.getId(), userId, request.side(), shares,
                contest.getSharePrice(), baseAmount, charge, totalDebit));

        walletService.ledger(userId, TxType.CONTEST_ENTRY, -baseAmount,
                contest.getTitle() + " - " + shares + (shares == 1 ? " share" : " shares"),
                contest.getId(), order.getId());
        walletService.ledger(userId, TxType.SIMULATED_CHARGE, -charge,
                "10% simulated charge", contest.getId(), order.getId());

        /* 7. try to find opponents ---------------------------------------- */
        int matched = matchingEngine.match(contest, order);

        if (matched > 0) {
            boolean complete = order.getRemainingShares() == 0;
            publisher.publish(userId,
                    complete ? WsEvent.FULL_MATCH : WsEvent.PARTIAL_MATCH,
                    complete ? "Opponent found" : "Partially matched",
                    complete
                            ? "All " + order.getRequestedShares() + " of your shares are matched."
                            : order.getMatchedShares() + " of " + order.getRequestedShares()
                                    + " shares matched. " + order.getRemainingShares() + " shares remaining.",
                    contest.getId());
        }

        return OrderDto.of(order);
    }

    /** Everything this user has ever entered, newest first. */
    @Transactional(readOnly = true)
    public List<MyOrderDto> myOrders(Long userId) {
        List<OrderEntity> orders = orderRepository.findByUserIdOrderByCreatedAtDesc(userId);
        if (orders.isEmpty()) {
            return List.of();
        }

        List<Long> contestIds = orders.stream().map(OrderEntity::getContestId).distinct().toList();
        Map<Long, Contest> contests = contestRepository.findAllById(contestIds).stream()
                .collect(Collectors.toMap(Contest::getId, Function.identity()));

        List<Long> eventIds = contests.values().stream().map(Contest::getEventId).distinct().toList();
        Map<Long, EventEntity> events = eventRepository.findAllById(eventIds).stream()
                .collect(Collectors.toMap(EventEntity::getId, Function.identity()));

        return orders.stream().map(o -> {
            Contest c = contests.get(o.getContestId());
            EventEntity e = c == null ? null : events.get(c.getEventId());
            return new MyOrderDto(
                    o.getId(), o.getContestId(), o.getUserId(), o.getSide(),
                    o.getRequestedShares(), o.getMatchedShares(), o.getRemainingShares(),
                    o.getSharePrice(), o.getBaseAmount(), o.getCharge(), o.getTotalDebit(),
                    o.getStatus(), o.getSettlementReturn(), o.getPnl(), o.getCreatedAt(),
                    c == null ? null : new ContestBriefDto(c.getId(), c.getTitle(), c.getQuestion(),
                            c.getStatus(), c.getSharePrice(), c.getFinalValue()),
                    e == null ? null : e.getTitle());
        }).toList();
    }
}
