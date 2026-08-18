package com.predictionmarket.event;

import com.predictionmarket.dto.EventDtos.EventDetailDto;
import com.predictionmarket.dto.EventDtos.EventDto;
import com.predictionmarket.security.CurrentUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * GET /api/events      -> the home grid
 * GET /api/events/{id} -> one event and every question inside it
 */
@RestController
@RequestMapping("/api/events")
public class EventController {

    private final EventService eventService;

    public EventController(EventService eventService) {
        this.eventService = eventService;
    }

    @GetMapping
    public List<EventDto> list() {
        return eventService.listForPlayer(CurrentUser.id());
    }

    @GetMapping("/{id}")
    public EventDetailDto one(@PathVariable Long id) {
        return eventService.detailForPlayer(id, CurrentUser.id());
    }
}
