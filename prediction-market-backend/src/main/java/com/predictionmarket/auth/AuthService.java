package com.predictionmarket.auth;

import com.predictionmarket.common.ApiException;
import com.predictionmarket.common.Enums.Role;
import com.predictionmarket.dto.AuthDtos.AuthResponse;
import com.predictionmarket.dto.AuthDtos.LoginRequest;
import com.predictionmarket.dto.AuthDtos.RegisterRequest;
import com.predictionmarket.dto.AuthDtos.UserDto;
import com.predictionmarket.security.JwtService;
import com.predictionmarket.user.User;
import com.predictionmarket.user.UserRepository;
import com.predictionmarket.wallet.WalletService;
import com.predictionmarket.websocket.LiveEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Register and login. That is the whole of authentication.
 *
 * There is no email, no OTP, no password reset and no change-password. The
 * user chooses a User ID and a password and must keep them - the UI says so
 * loudly on both screens. Adding recovery later would mean adding a contact
 * channel, which this project deliberately does not have.
 */
@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final WalletService walletService;
    private final LiveEventPublisher publisher;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       WalletService walletService,
                       LiveEventPublisher publisher) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.walletService = walletService;
        this.publisher = publisher;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String userId = request.userId().trim();

        if (userRepository.existsByUserIdIgnoreCase(userId)) {
            throw ApiException.conflict("That User ID is already taken. Please choose another.");
        }

        User user = new User(userId, request.name().trim(),
                passwordEncoder.encode(request.password()), Role.USER);

        try {
            user = userRepository.save(user);
            userRepository.flush();
        } catch (DataIntegrityViolationException ex) {
            // Two people registering the same handle at the same moment: the
            // unique index decides, and the loser gets the same message as if
            // they had simply been second.
            throw ApiException.conflict("That User ID is already taken. Please choose another.");
        }

        walletService.ensureWallet(user.getId());

        publisher.publish(user.getId(), "WELCOME", "Welcome to the simulator",
                "Your account is ready. The admin will credit your virtual tokens shortly.", null);

        return new AuthResponse(jwtService.generate(user), UserDto.of(user));
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String userId = request.userId() == null ? "" : request.userId().trim();

        User user = userRepository.findByUserIdIgnoreCase(userId)
                // Same message for "no such user" and "wrong password" so the
                // login form cannot be used to discover who has an account.
                .orElseThrow(() -> ApiException.unauthorised("Wrong User ID or password."));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw ApiException.unauthorised("Wrong User ID or password.");
        }

        return new AuthResponse(jwtService.generate(user), UserDto.of(user));
    }
}
