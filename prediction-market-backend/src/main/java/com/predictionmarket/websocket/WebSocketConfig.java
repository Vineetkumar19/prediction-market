package com.predictionmarket.websocket;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

import java.util.Arrays;

/**
 * Registers the one WebSocket endpoint: /ws
 *
 * Plain WebSocket, not STOMP or SockJS - the client is a bare
 * `new WebSocket(url)` and the frames are plain JSON, so there is nothing to
 * gain from the heavier protocols here.
 */
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final LiveSocketHandler handler;
    private final HandshakeAuthInterceptor handshakeInterceptor;
    private final String allowedOrigins;

    public WebSocketConfig(LiveSocketHandler handler,
                           HandshakeAuthInterceptor handshakeInterceptor,
                           @Value("${app.cors.allowed-origins}") String allowedOrigins) {
        this.handler = handler;
        this.handshakeInterceptor = handshakeInterceptor;
        this.allowedOrigins = allowedOrigins;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        String[] origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toArray(String[]::new);

        registry.addHandler(handler, "/ws")
                .addInterceptors(handshakeInterceptor)
                .setAllowedOrigins(origins);
    }
}
