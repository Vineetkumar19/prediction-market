package com.predictionmarket.user;

import com.predictionmarket.common.Enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    /** Login is case-insensitive: "Rahul" and "rahul" are the same account. */
    Optional<User> findByUserIdIgnoreCase(String userId);

    boolean existsByUserIdIgnoreCase(String userId);

    long countByRole(Role role);

    List<User> findAllByOrderByCreatedAtDesc();
}
