package com.predictionmarket.notification;

import com.predictionmarket.security.CurrentUser;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * GET  /api/notifications           -> the caller's stored messages
 * POST /api/notifications/read-all  -> mark them all read
 *
 * These are the durable copies of what went out over the WebSocket, so a user
 * who had the tab closed still finds out their shares were matched.
 */
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationRepository repository;

    public NotificationController(NotificationRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Notification> mine() {
        return repository.findByUserIdOrderByCreatedAtDesc(CurrentUser.id());
    }

    @PostMapping("/read-all")
    @Transactional
    public Map<String, String> readAll() {
        repository.markAllRead(CurrentUser.id());
        return Map.of("message", "All marked as read.");
    }
}
