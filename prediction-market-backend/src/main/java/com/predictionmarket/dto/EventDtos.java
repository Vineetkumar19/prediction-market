package com.predictionmarket.dto;

import com.predictionmarket.common.Enums.EventStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

/**
 * Events are what the home screen shows: a picture, the event title and the
 * label the admin chose. No prices and no questions - those appear only after
 * the user opens the event.
 */
public final class EventDtos {

    private EventDtos() {
    }

    /**
     * A card on the home grid.
     *
     * `myEntryCount` is this user's own count and nobody else's. There is no
     * field here for how many other people joined, and there should not be.
     */
    public record EventDto(
            Long id,
            String title,
            String label,
            String imageUrl,
            EventStatus status,
            Instant createdAt,
            int questionCount,
            int liveQuestionCount,
            int myEntryCount) {
    }

    /** One event with every question inside it. */
    public record EventDetailDto(
            Long id,
            String title,
            String label,
            String imageUrl,
            EventStatus status,
            Instant createdAt,
            int questionCount,
            int liveQuestionCount,
            int myEntryCount,
            List<ContestDtos.ContestDto> contests) {
    }

    /** Admin list row: the same event plus how many questions hang off it. */
    public record AdminEventDto(
            Long id,
            String title,
            String label,
            String imageUrl,
            EventStatus status,
            Instant createdAt,
            int questionCount) {
    }

    public record CreateEventRequest(
            @NotBlank(message = "Enter an event title")
            @Size(max = 160, message = "That title is too long")
            String title,

            @Size(max = 160, message = "That label is too long")
            String label,

            @Size(max = 1000, message = "That image URL is too long")
            String imageUrl) {
    }
}
