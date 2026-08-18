package com.predictionmarket.security;

import com.predictionmarket.common.ApiException;
import com.predictionmarket.user.User;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * "Who is calling?" in one line.
 *
 * Every service that touches user-owned data asks this rather than trusting a
 * userId sent in the request body - a user must never be able to read or
 * change another user's wallet or orders by editing a payload.
 */
public final class CurrentUser {

    private CurrentUser() {
    }

    public static User get() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof User user)) {
            throw ApiException.unauthorised("Your session expired. Please log in again.");
        }
        return user;
    }

    public static Long id() {
        return get().getId();
    }

    public static User requireAdmin() {
        User user = get();
        if (!user.isAdmin()) {
            throw ApiException.forbidden("Admin access only.");
        }
        return user;
    }
}
