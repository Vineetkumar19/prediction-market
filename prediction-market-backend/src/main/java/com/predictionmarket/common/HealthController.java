package com.predictionmarket.common;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

/**
 * GET /api/health - open, no token needed.
 *
 * Useful when connecting the two projects for the first time: if this returns
 * JSON in the browser, the backend is up, the port is right and CORS is not the
 * problem. If it does not, nothing else is worth debugging yet.
 */
@RestController
@RequestMapping("/api")
public class HealthController {

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of(
                "status", "ok",
                "service", "prediction-market-backend",
                "time", Instant.now().toString());
    }
}
