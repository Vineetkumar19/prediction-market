package com.predictionmarket.scheduler;

import com.predictionmarket.audit.AuditService;
import com.predictionmarket.common.Enums.ContestStatus;
import com.predictionmarket.common.Enums.WsEvent;
import com.predictionmarket.contest.Contest;
import com.predictionmarket.contest.ContestRepository;
import com.predictionmarket.order.OrderEntity;
import com.predictionmarket.order.OrderRepository;
import com.predictionmarket.settlement.RefundService;
import com.predictionmarket.websocket.LiveEventPublisher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Closes one question whose matching deadline has passed.
 *
 * This lives in its own bean rather than inside DeadlineJob on purpose: Spring
 * applies @Transactional through a proxy, and a method calling another method
 * on `this` goes straight past the proxy. Calling it from a separate bean is
 * what actually gives each question its own transaction, which is the whole
 * point - one failing question must not roll back or block the others.
 */
@Component
public class DeadlineProcessor {

    private static final Logger log = LoggerFactory.getLogger(DeadlineProcessor.class);

    private final ContestRepository contestRepository;
    private final OrderRepository orderRepository;
    private final RefundService refundService;
    private final LiveEventPublisher publisher;
    private final AuditService auditService;

    public DeadlineProcessor(ContestRepository contestRepository,
                             OrderRepository orderRepository,
                             RefundService refundService,
                             LiveEventPublisher publisher,
                             AuditService auditService) {
        this.contestRepository = contestRepository;
        this.orderRepository = orderRepository;
        this.refundService = refundService;
        this.publisher = publisher;
        this.auditService = auditService;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void process(Long contestId) {
        Contest contest = contestRepository.lockById(contestId).orElse(null);

        // Re-check under the lock: an admin may have settled or cancelled this
        // question between the scan that found it and this transaction starting.
        if (contest == null || !contest.getStatus().isJoinable() || !contest.deadlinePassed()) {
            return;
        }

        List<OrderEntity> orders = orderRepository.findByContestId(contestId);
        int matched = orders.stream().mapToInt(OrderEntity::getMatchedShares).sum();

        if (matched == 0) {
            // Nobody took the other side at all - spec section 10.
            refundService.cancelContest(contest,
                    "Contest cancelled because an opponent was not found. "
                            + "Your tokens have been refunded in full.");
            auditService.record("CONTEST_CANCELLED", AuditService.SYSTEM,
                    "contest:" + contestId, null, "OPPONENT_NOT_FOUND");
            log.info("Contest {} cancelled at deadline - no opponent", contestId);
            return;
        }

        // Some shares matched: only the leftovers go home - spec section 11.
        int leftOver = orders.stream().mapToInt(OrderEntity::getRemainingShares).sum();
        refundService.refundUnmatched(contest, true);

        // MATCHED means "everyone found an opponent"; LOCKED means "closed with
        // some shares refunded". Players see both as simply Closed; the
        // distinction is for the admin screens.
        contest.setStatus(leftOver == 0 ? ContestStatus.MATCHED : ContestStatus.LOCKED);
        contestRepository.save(contest);

        orders.stream()
                .map(OrderEntity::getUserId)
                .distinct()
                .forEach(userId -> publisher.publish(userId, WsEvent.CONTEST_LOCKED, "Contest locked",
                        "This question is now locked. No new entries are accepted.", contestId));

        auditService.record("DEADLINE_LOCK", AuditService.SYSTEM, "contest:" + contestId,
                (long) matched, "matchedShares=" + matched);
        log.info("Contest {} locked at deadline with {} matched shares", contestId, matched);
    }
}
