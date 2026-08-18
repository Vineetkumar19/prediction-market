package com.predictionmarket.matching;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MatchRecordRepository extends JpaRepository<MatchRecord, Long> {

    List<MatchRecord> findByContestId(Long contestId);
}
