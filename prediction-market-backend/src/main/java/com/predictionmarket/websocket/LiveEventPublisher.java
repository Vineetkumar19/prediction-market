package com.predictionmarket.websocket;

import com.predictionmarket.common.Enums.WsEvent;
import com.predictionmarket.notification.Notification;
import com.predictionmarket.notification.NotificationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * One call to tell a user something happened: store it, then push it.
 *
 * Two details that matter:
 *
 * 1. The notification row is written inside the caller's transaction, but the
 *    socket frame is only sent after that transaction commits. If the order
 *    placement rolls back, the user is never told about a match that did not
 *    actually happen.
 *
 * 2. The frame carries only what the UI needs for a toast. The screen then
 *    re-fetches over REST, so the frame never has to be trusted for numbers.
 */
@Service
public class LiveEventPublisher {

    private final NotificationRepository notificationRepository;
    private final LiveSocketHandler socketHandler;

    public LiveEventPublisher(NotificationRepository notificationRepository, LiveSocketHandler socketHandler) {
        this.notificationRepository = notificationRepository;
        this.socketHandler = socketHandler;
    }

    public void publish(Long userId, WsEvent event, String title, String message, Long contestId) {
        publish(userId, event.name(), title, message, contestId);
    }

    public void publish(Long userId, String event, String title, String message, Long contestId) {
        Notification saved = notificationRepository.save(
                new Notification(userId, event, title, message, contestId));

        Map<String, Object> frame = new LinkedHashMap<>();
        frame.put("event", event);
        frame.put("title", title);
        frame.put("message", message);
        frame.put("contestId", contestId);
        frame.put("userId", userId);
        frame.put("notificationId", saved.getId());
        frame.put("at", saved.getCreatedAt().toString());

        sendAfterCommit(userId, frame);
    }

    /** A frame with no stored notification - used for plain wallet nudges. */
    public void nudge(Long userId, WsEvent event, String title, String message, Long contestId) {
        Map<String, Object> frame = new LinkedHashMap<>();
        frame.put("event", event.name());
        frame.put("title", title);
        frame.put("message", message);
        frame.put("contestId", contestId);
        frame.put("userId", userId);
        sendAfterCommit(userId, frame);
    }

    private void sendAfterCommit(Long userId, Map<String, Object> frame) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    socketHandler.sendToUser(userId, frame);
                }
            });
        } else {
            socketHandler.sendToUser(userId, frame);
        }
    }
}
