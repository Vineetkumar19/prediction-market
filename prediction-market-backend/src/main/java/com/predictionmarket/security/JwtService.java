package com.predictionmarket.security;

import com.predictionmarket.user.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.Optional;

/**
 * Issues and verifies the JWT.
 *
 * The token carries the numeric user id as the subject plus the login handle
 * and role as claims, which is enough for the auth filter to build the
 * security context without a database read on every request (it still does one
 * so a deleted user cannot keep using an old token, but the claims are there
 * if that ever needs to change).
 */
@Service
public class JwtService {

    private final SecretKey key;
    private final long expiryHours;

    public JwtService(@Value("${app.jwt.secret}") String secret,
                      @Value("${app.jwt.expiry-hours:720}") long expiryHours) {
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalStateException(
                    "app.jwt.secret must be at least 32 characters. Set a longer value in application.properties.");
        }
        this.key = Keys.hmacShaKeyFor(bytes);
        this.expiryHours = expiryHours;
    }

    public String generate(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(user.getId()))
                .claim("userId", user.getUserId())
                .claim("role", user.getRole().name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(expiryHours, ChronoUnit.HOURS)))
                .signWith(key)
                .compact();
    }

    /** The numeric user id inside a valid token, or empty if the token is bad. */
    public Optional<Long> extractUserId(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return Optional.of(Long.valueOf(claims.getSubject()));
        } catch (Exception ex) {
            // Expired, tampered with, or simply not a JWT. All the same to us.
            return Optional.empty();
        }
    }
}
