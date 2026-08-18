package com.predictionmarket.websocket;

import com.predictionmarket.security.JwtService;
import com.predictionmarket.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

/**
 * Authenticates the WebSocket upgrade.
 *
 * A browser cannot put an Authorization header on a WebSocket handshake, so
 * the client appends the JWT as ?token=... (see useWebSocket.js). This
 * interceptor is the only place that reads it. A missing or invalid token
 * fails the handshake outright - the socket never opens - rather than opening
 * an anonymous connection that would then have to be policed later.
 */
@Component
public class HandshakeAuthInterceptor implements HandshakeInterceptor {

    public static final String USER_ID_ATTRIBUTE = "pmsUserId";

    private static final Logger log = LoggerFactory.getLogger(HandshakeAuthInterceptor.class);

    private final JwtService jwtService;
    private final UserRepository userRepository;

    public HandshakeAuthInterceptor(JwtService jwtService, UserRepository userRepository) {
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Map<String, Object> attributes) {

        String token = extractToken(request);
        if (token == null || token.isBlank()) {
            log.debug("WebSocket handshake rejected: no token");
            return false;
        }

        var userId = jwtService.extractUserId(token);
        if (userId.isEmpty() || !userRepository.existsById(userId.get())) {
            log.debug("WebSocket handshake rejected: bad token");
            return false;
        }

        attributes.put(USER_ID_ATTRIBUTE, userId.get());
        return true;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler wsHandler, Exception exception) {
        // nothing to do
    }

    private String extractToken(ServerHttpRequest request) {
        if (request instanceof ServletServerHttpRequest servletRequest) {
            return servletRequest.getServletRequest().getParameter("token");
        }
        String query = request.getURI().getQuery();
        if (query == null) {
            return null;
        }
        for (String part : query.split("&")) {
            if (part.startsWith("token=")) {
                return java.net.URLDecoder.decode(part.substring(6), java.nio.charset.StandardCharsets.UTF_8);
            }
        }
        return null;
    }
}
