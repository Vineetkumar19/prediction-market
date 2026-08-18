package com.predictionmarket.dto;

import com.predictionmarket.common.Enums.Role;
import com.predictionmarket.user.User;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;

/**
 * Auth request and response shapes.
 *
 * DTOs are grouped by feature into one holder class each. It keeps the field
 * names of a whole API area visible on one screen, which is what you want when
 * you are checking them against the frontend's expectations.
 *
 * Note there is no email field and no change-password request anywhere. Login
 * is User ID + password only, and a password can never be changed - if it is
 * lost, the user makes a new account. That is deliberate.
 */
public final class AuthDtos {

    private AuthDtos() {
    }

    public record LoginRequest(
            @NotBlank(message = "Enter your User ID") String userId,
            @NotBlank(message = "Enter your password") String password) {
    }

    public record RegisterRequest(
            @NotBlank(message = "Enter your name")
            @Size(max = 80, message = "That name is too long")
            String name,

            @NotBlank(message = "Choose a User ID")
            @Size(min = 3, max = 40, message = "User ID must be 3 to 40 characters")
            @Pattern(regexp = "^[A-Za-z0-9._-]+$",
                    message = "User ID can only use letters, numbers, dot, underscore and hyphen")
            String userId,

            @NotBlank(message = "Choose a password")
            @Size(min = 6, max = 72, message = "Password must be at least 6 characters")
            String password) {
    }

    /** What every screen means by "the user". Never includes the password hash. */
    public record UserDto(Long id, String userId, String name, Role role, Instant createdAt) {

        public static UserDto of(User user) {
            return new UserDto(user.getId(), user.getUserId(), user.getName(), user.getRole(), user.getCreatedAt());
        }
    }

    public record AuthResponse(String token, UserDto user) {
    }
}
