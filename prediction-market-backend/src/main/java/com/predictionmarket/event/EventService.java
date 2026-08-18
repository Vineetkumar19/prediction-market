package com.predictionmarket.event;

import com.predictionmarket.common.ApiException;
import com.predictionmarket.common.Enums.ContestStatus;
import com.predictionmarket.contest.Contest;
import com.predictionmarket.contest.ContestRepository;
import com.predictionmarket.contest.ContestService;
import com.predictionmarket.dto.ContestDtos.ContestDto;
import com.predictionmarket.dto.EventDtos.AdminEventDto;
import com.predictionmarket.dto.EventDtos.CreateEventRequest;
import com.predictionmarket.dto.EventDtos.EventDetailDto;
import com.predictionmarket.dto.EventDtos.EventDto;
import com.predictionmarket.order.OrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Events - the home screen.
 *
 * An event card carries a picture, a title, a label and three counts. Two of
 * those counts are about the event itself (how many questions, how many are
 * live) and one is about the caller only (how many they have entered). Nothing
 * here reveals anything about other players.
 */
@Service
public class EventService {

    private final EventRepository eventRepository;
    private final ContestRepository contestRepository;
    private final OrderRepository orderRepository;
    private final ContestService contestService;

    public EventService(EventRepository eventRepository,
                        ContestRepository contestRepository,
                        OrderRepository orderRepository,
                        ContestService contestService) {
        this.eventRepository = eventRepository;
        this.contestRepository = contestRepository;
        this.orderRepository = orderRepository;
        this.contestService = contestService;
    }

    /** The home grid. Events with no published question are not shown at all. */
    @Transactional(readOnly = true)
    public List<EventDto> listForPlayer(Long userId) {
        List<EventEntity> events = eventRepository.findAllByOrderByCreatedAtDesc();
        if (events.isEmpty()) {
            return List.of();
        }

        List<Contest> published = contestRepository.findAll().stream()
                .filter(c -> c.getStatus() != ContestStatus.DRAFT)
                .toList();

        Set<Long> myContestIds = new HashSet<>(orderRepository.findContestIdsWithEntriesByUser(userId));

        Map<Long, List<Contest>> byEvent = published.stream()
                .collect(Collectors.groupingBy(Contest::getEventId));

        return events.stream()
                .map(event -> {
                    List<Contest> list = byEvent.getOrDefault(event.getId(), List.of());
                    int live = (int) list.stream().filter(c -> c.getStatus().isJoinable()).count();
                    int mine = (int) list.stream().filter(c -> myContestIds.contains(c.getId())).count();
                    return new EventDto(event.getId(), event.getTitle(), event.getLabel(),
                            nullToEmpty(event.getImageUrl()), event.getStatus(), event.getCreatedAt(),
                            list.size(), live, mine);
                })
                .filter(dto -> dto.questionCount() > 0)
                .sorted(Comparator.comparing(EventDto::createdAt).reversed())
                .toList();
    }

    @Transactional(readOnly = true)
    public EventDetailDto detailForPlayer(Long eventId, Long userId) {
        EventEntity event = eventRepository.findById(eventId)
                .orElseThrow(() -> ApiException.notFound("Event not found."));

        List<ContestDto> contests = contestService.listForEvent(event, userId);

        int live = (int) contests.stream().filter(c -> c.status().isJoinable()).count();
        int mine = (int) contests.stream().filter(c -> !c.myOrders().isEmpty()).count();

        return new EventDetailDto(event.getId(), event.getTitle(), event.getLabel(),
                nullToEmpty(event.getImageUrl()), event.getStatus(), event.getCreatedAt(),
                contests.size(), live, mine, contests);
    }

    /* ---- admin ---------------------------------------------------------- */

    @Transactional(readOnly = true)
    public List<AdminEventDto> listForAdmin() {
        Map<Long, Long> counts = contestRepository.countGroupedByEvent().stream()
                .collect(Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1]));

        return eventRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(e -> new AdminEventDto(e.getId(), e.getTitle(), e.getLabel(),
                        nullToEmpty(e.getImageUrl()), e.getStatus(), e.getCreatedAt(),
                        counts.getOrDefault(e.getId(), 0L).intValue()))
                .toList();
    }

    @Transactional
    public AdminEventDto create(CreateEventRequest request) {
        EventEntity event = eventRepository.save(new EventEntity(
                request.title().trim(),
                request.label() == null ? "" : request.label().trim(),
                request.imageUrl() == null ? "" : request.imageUrl().trim()));

        return new AdminEventDto(event.getId(), event.getTitle(), event.getLabel(),
                nullToEmpty(event.getImageUrl()), event.getStatus(), event.getCreatedAt(), 0);
    }

    /** Flips OPEN <-> CLOSED. Closing an event does not touch its questions. */
    @Transactional
    public AdminEventDto toggle(Long eventId) {
        EventEntity event = eventRepository.findById(eventId)
                .orElseThrow(() -> ApiException.notFound("Event not found."));
        event.toggleStatus();
        eventRepository.save(event);

        int count = contestRepository.findByEventIdOrderByCreatedAtAsc(eventId).size();
        return new AdminEventDto(event.getId(), event.getTitle(), event.getLabel(),
                nullToEmpty(event.getImageUrl()), event.getStatus(), event.getCreatedAt(), count);
    }

    @Transactional(readOnly = true)
    public EventEntity require(Long eventId) {
        return eventRepository.findById(eventId)
                .orElseThrow(() -> ApiException.notFound("Event not found."));
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
