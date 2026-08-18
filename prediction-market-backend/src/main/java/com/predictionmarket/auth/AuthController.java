package com.predictionmarket.auth;

import com.predictionmarket.dto.AuthDtos.AuthResponse;
import com.predictionmarket.dto.AuthDtos.LoginRequest;
import com.predictionmarket.dto.AuthDtos.RegisterRequest;
import com.predictionmarket.dto.AuthDtos.UserDto;
import com.predictionmarket.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

/**
 * POST /api/auth/login     { userId, password }       -> { token, user }
 * POST /api/auth/register  { name, userId, password } -> { token, user }
 * GET  /api/auth/me                                   -> user
 *
 * /me is what the frontend calls on page load to decide whether a stored token
 * is still good. A 401 here makes the client drop the token and show the login
 * screen.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/me")
    public UserDto me() {
        return UserDto.of(CurrentUser.get());
    }
}
