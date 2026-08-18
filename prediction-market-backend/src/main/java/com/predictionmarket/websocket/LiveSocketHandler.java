package com.predictionmarket.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Keeps the open sockets and pushes JSON frames to one user.
 *
 * A user can have several sockets at once - laptop and phone, or two tabs - so
 * the map holds a set per user, not a single session.
 *
 * The socket is a nudge, never the source of truth. Every screen re-fetches
 * over REST when a frame arrives, so a lost frame is a cosmetic delay and not a
 * wrong balance on screen.
 */
@Component
public class LiveSocketHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(LiveSocketHandler.class);

    private final ObjectMapper objectMapper;
    private final Map<Long, Set<WebSocketSession>> sessions = new ConcurrentHashMap<>();

    public LiveSocketHandler(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void afterConnectionEstablished(@NonNull WebSocketSession session) {
        Long userId = userIdOf(session);
        if (userId == null) {
            close(session);
            return;
        }
        sessions.computeIfAbsent(userId, k -> ConcurrentHashMap.newKeySet()).add(session);
        log.debug("WebSocket opened for user {}", userId);
    }

    @Override
    public void afterConnectionClosed(@NonNull WebSocketSession session, @NonNull CloseStatus status) {
        Long userId = userIdOf(session);
        if (userId == null) {
            return;
        }
        Set<WebSocketSession> set = sessions.get(userId);
        if (set != null) {
            set.remove(session);
            if (set.isEmpty()) {
                sessions.remove(userId);
            }
        }
    }

    /** Sends one frame to every socket this user has open. Never throws. */
    public void sendToUser(Long userId, Object payload) {
        Set<WebSocketSession> set = sessions.get(userId);
        if (set == null || set.isEmpty()) {
            return; // nobody is listening; the stored notification covers it
        }

        String json;
        try {
            json = objectMapper.writeValueAsString(payload);
        } catch (Exception ex) {
            log.warn("Could not serialise live frame", ex);
            return;
        }

        for (WebSocketSession session : set) {
            try {
                if (session.isOpen()) {
                    synchronized (session) {
                        session.sendMessage(new TextMessage(json));
                    }
                }
            } catch (IOException ex) {
                log.debug("Dropping dead socket for user {}", userId);
                set.remove(session);
            }
        }
    }

    public int openConnections() {
        return sessions.values().stream().mapToInt(Set::size).sum();
    }

    private Long userIdOf(WebSocketSession session) {
        Object value = session.getAttributes().get(HandshakeAuthInterceptor.USER_ID_ATTRIBUTE);
        return (value instanceof Long id) ? id : null;
    }

    private void close(WebSocketSession session) {
        try {
            session.close(CloseStatus.NOT_ACCEPTABLE);
        } catch (IOException ignored) {
            // already gone
        }
    }
}
