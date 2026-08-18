package com.predictionmarket.dto;

import com.predictionmarket.common.Enums.Role;

import java.time.Instant;

public final class AdminDtos {

    private AdminDtos() {
    }

    /** The tiles across the top of the admin overview. */
    public record AdminStatsDto(
            long users,
            long events,
            long liveContests,
            long totalContests,
            long tokensIssued,
            long tokensLocked,
            long openOrders) {
    }

    /** A row in Users & tokens: the user plus their balance. */
    public record AdminUserDto(
            Long id,
            String userId,
            String name,
            Role role,
            Instant createdAt,
            long available,
            long locked,
            long total) {
    }
}
