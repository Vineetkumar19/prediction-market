package com.predictionmarket.matching;

import com.predictionmarket.common.Enums.ContestStatus;
import com.predictionmarket.common.Enums.Side;
import com.predictionmarket.common.Enums.WsEvent;
import com.predictionmarket.contest.Contest;
import com.predictionmarket.contest.ContestRepository;
import com.predictionmarket.order.OrderEntity;
import com.predictionmarket.order.OrderRepository;
import com.predictionmarket.websocket.LiveEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * The matching engine (spec section 6).
 *
 * Because both sides pay the same fixed price there is no order book and no
 * price discovery - matching is only ever "how many opposing shares are
 * waiting":
 *
 *     matchedShares = MIN(unmatched YES, unmatched NO)
 *
 * Fills are FIFO: the oldest waiting order on the other side is filled first,
 * so whoever committed their tokens earliest gets served earliest. One new
 * order can fill several counterparties, and each fill writes its own
 * MatchRecord so every match stays traceable.
 *
 * CONCURRENCY
 * -----------
 * This method must only be called from a transaction that already holds the
 * PESSIMISTIC_WRITE lock on the contest row (ContestRepository.lockById). That
 * is what makes two simultaneous orders on the same question queue up instead
 * of both matching against the same waiting shares. Propagation.MANDATORY
 * makes the requirement fail loudly rather than silently if someone calls this
 * from outside a transaction later.
 *
 * No wallet is touched here. Tokens were already moved into `locked` when the
 * order was placed; matching only decides which shares found an opponent.
 */
@Service
public class MatchingEngine {

    private final OrderRepository orderRepository;
    private final ContestRepository contestRepository;
    private final MatchRecordRepository matchRecordRepository;
    private final LiveEventPublisher publisher;

    public MatchingEngine(OrderRepository orderRepository,
                          ContestRepository contestRepository,
                          MatchRecordRepository matchRecordRepository,
                          LiveEventPublisher publisher) {
        this.orderRepository = orderRepository;
        this.contestRepository = contestRepository;
        this.matchRecordRepository = matchRecordRepository;
        this.publisher = publisher;
    }

    /**
     * @return how many shares of the incoming order found an opponent.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public int match(Contest contest, OrderEntity incoming) {
        Side opposite = incoming.getSide().opposite();
        List<OrderEntity> waiting = orderRepository.lockOpenOrders(contest.getId(), opposite);

        int newlyMatched = 0;

        for (OrderEntity other : waiting) {
            if (incoming.getRemainingShares() <= 0) {
                break;
            }
            int fill = Math.min(incoming.getRemainingShares(), other.getRemainingShares());
            if (fill <= 0) {
                continue;
            }

            incoming.fill(fill);
            other.fill(fill);
            other.refreshStatus();
            orderRepository.save(other);

            OrderEntity yesOrder = incoming.getSide() == Side.YES ? incoming : other;
            OrderEntity noOrder = incoming.getSide() == Side.YES ? other : incoming;
            matchRecordRepository.save(new MatchRecord(
                    contest.getId(), yesOrder.getId(), noOrder.getId(), fill, contest.getSharePrice()));

            newlyMatched += fill;
            notifyCounterparty(contest, other, fill);
        }

        incoming.refreshStatus();
        orderRepository.save(incoming);

        if (newlyMatched > 0) {
            updateContestStatus(contest);
        }

        return newlyMatched;
    }

    /**
     * A question that has any matched shares becomes PARTIAL and stays there
     * until its deadline.
     *
     * It deliberately does NOT flip to MATCHED the moment the book happens to
     * clear. Both isJoinable() and the frontend treat MATCHED as closed, so
     * doing that would lock a question hours early: if two people match 5-vs-5
     * at 09:00 on a question that runs until 17:00, everybody else would be
     * turned away for the rest of the day. MATCHED is set by the deadline job,
     * once entries genuinely are over.
     */
    private void updateContestStatus(Contest contest) {
        List<OrderEntity> all = orderRepository.findByContestId(contest.getId());
        int matched = all.stream().mapToInt(OrderEntity::getMatchedShares).sum();

        if (matched > 0 && contest.getStatus() == ContestStatus.OPEN) {
            contest.setStatus(ContestStatus.PARTIAL);
            contestRepository.save(contest);
        }
    }

    private void notifyCounterparty(Contest contest, OrderEntity other, int fill) {
        boolean complete = other.getRemainingShares() == 0;

        publisher.publish(
                other.getUserId(),
                complete ? WsEvent.FULL_MATCH : WsEvent.NEW_OPPONENT_MATCHED,
                complete ? "Opponent found" : "More shares matched",
                complete
                        ? "All " + other.getRequestedShares() + " of your shares are matched."
                        : fill + (fill == 1 ? " more share was" : " more shares were") + " matched. "
                                + other.getRemainingShares() + " still waiting.",
                contest.getId());
    }
}
