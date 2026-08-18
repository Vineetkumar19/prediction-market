package com.predictionmarket.contest;

import com.predictionmarket.common.ApiException;
import com.predictionmarket.common.Enums.ContestStatus;
import com.predictionmarket.dto.ContestDtos.ContestDto;
import com.predictionmarket.event.EventEntity;
import com.predictionmarket.event.EventRepository;
import com.predictionmarket.order.OrderEntity;
import com.predictionmarket.order.OrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Player-facing reads for questions.
 *
 * Every method here takes the caller's user id and only ever loads that user's
 * own orders. If you find yourself needing every order on a question, you are
 * writing an admin feature and it belongs in AdminService.
 */
@Service
public class ContestService {

    private final ContestRepository contestRepository;
    private final EventRepository eventRepository;
    private final OrderRepository orderRepository;
    private final ContestMapper mapper;

    public ContestService(ContestRepository contestRepository,
                          EventRepository eventRepository,
                          OrderRepository orderRepository,
                          ContestMapper mapper) {
        this.contestRepository = contestRepository;
        this.eventRepository = eventRepository;
        this.orderRepository = orderRepository;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public ContestDto getForPlayer(Long contestId, Long userId) {
        Contest contest = contestRepository.findById(contestId)
                .orElseThrow(() -> ApiException.notFound("Question not found."));

        EventEntity event = eventRepository.findById(contest.getEventId()).orElse(null);
        List<OrderEntity> myOrders =
                orderRepository.findByContestIdAndUserIdOrderByCreatedAtAsc(contestId, userId);

        return mapper.toPlayerDto(contest, event, myOrders);
    }

    /** Every published question inside one event, oldest first. Drafts are hidden. */
    @Transactional(readOnly = true)
    public List<ContestDto> listForEvent(EventEntity event, Long userId) {
        List<Contest> contests = contestRepository
                .findByEventIdAndStatusNotOrderByCreatedAtAsc(event.getId(), ContestStatus.DRAFT);

        if (contests.isEmpty()) {
            return List.of();
        }

        List<Long> ids = contests.stream().map(Contest::getId).toList();

        // One query for this user's orders across the whole event, then grouped
        // in memory - avoids a query per question on a busy event page.
        Map<Long, List<OrderEntity>> mine = orderRepository.findByContestIdIn(ids).stream()
                .filter(o -> o.getUserId().equals(userId))
                .collect(Collectors.groupingBy(OrderEntity::getContestId));

        return contests.stream()
                .map(c -> mapper.toPlayerDto(c, event,
                        mine.getOrDefault(c.getId(), List.of()).stream()
                                .sorted(Comparator.comparing(OrderEntity::getCreatedAt))
                                .toList()))
                .toList();
    }

    @Transactional(readOnly = true)
    public Contest require(Long contestId) {
        return contestRepository.findById(contestId)
                .orElseThrow(() -> ApiException.notFound("Question not found."));
    }
}
