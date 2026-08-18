package com.predictionmarket.contest;

import com.predictionmarket.common.Enums.ContestStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ContestRepository extends JpaRepository<Contest, Long> {

    List<Contest> findByEventIdOrderByCreatedAtAsc(Long eventId);

    List<Contest> findByEventIdAndStatusNotOrderByCreatedAtAsc(Long eventId, ContestStatus status);

    List<Contest> findAllByOrderByCreatedAtDesc();

    long countByStatusIn(Collection<ContestStatus> statuses);

    List<Contest> findByStatusInAndMatchingDeadlineBefore(Collection<ContestStatus> statuses, Instant cutoff);

    @Query("select c.eventId, count(c) from Contest c group by c.eventId")
    List<Object[]> countGroupedByEvent();

    /**
     * SELECT ... FOR UPDATE on the question row.
     *
     * Every operation that can change matching state - placing an order,
     * refunding at the deadline, cancelling, settling - takes this lock first.
     * That makes all of them run one at a time per question, which is what
     * stops two simultaneous orders from both matching against the same
     * counter-order, and stops a settle racing a late entry.
     *
     * Lock order across the whole codebase is: contest first, then wallets
     * (ascending user id). Keeping that order everywhere is what prevents
     * deadlocks.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Contest c where c.id = :id")
    Optional<Contest> lockById(@Param("id") Long id);
}
