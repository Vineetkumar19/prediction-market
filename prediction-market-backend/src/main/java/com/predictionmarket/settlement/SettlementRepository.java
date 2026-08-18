package com.predictionmarket.settlement;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SettlementRepository extends JpaRepository<Settlement, Long> {

    Optional<Settlement> findByContestId(Long contestId);

    boolean existsByContestId(Long contestId);
}
