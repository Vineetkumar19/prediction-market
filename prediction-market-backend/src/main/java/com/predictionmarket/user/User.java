package com.predictionmarket.user;

import com.predictionmarket.common.Enums.Role;
import jakarta.persistence.*;

import java.time.Instant;

/**
 * A player or the admin.
 *
 * There is no email column and no password-reset column on purpose: the app
 * logs in with a chosen User ID and a password, and nobody - not even the
 * admin - can change or recover a password. That is a product decision, not an
 * oversight. If a user loses their credentials they make a new account.
 */
@Entity
@Table(name = "users", uniqueConstraints = @UniqueConstraint(name = "uk_users_user_id", columnNames = "user_id"))
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The login handle the user chose, e.g. "rahul". Case-insensitive on login. */
    @Column(name = "user_id", nullable = false, length = 40)
    private String userId;

    @Column(nullable = false, length = 80)
    private String name;

    /** BCrypt hash. The plain password is never stored or logged. */
    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Role role = Role.USER;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected User() {
    }

    public User(String userId, String name, String passwordHash, Role role) {
        this.userId = userId;
        this.name = name;
        this.passwordHash = passwordHash;
        this.role = role;
        this.createdAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public String getUserId() {
        return userId;
    }

    public String getName() {
        return name;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public Role getRole() {
        return role;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public boolean isAdmin() {
        return role == Role.ADMIN;
    }
}
