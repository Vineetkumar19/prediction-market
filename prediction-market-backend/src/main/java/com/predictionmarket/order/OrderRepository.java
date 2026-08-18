package com.predictionmarket.order;

import com.predictionmarket.common.Enums.Side;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface OrderRepository extends JpaRepository<OrderEntity, Long> {

    List<OrderEntity> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<OrderEntity> findByContestId(Long contestId);

    List<OrderEntity> findByContestIdAndUserIdOrderByCreatedAtAsc(Long contestId, Long userId);

    List<OrderEntity> findByContestIdIn(Collection<Long> contestIds);

    long countByRemainingSharesGreaterThan(int shares);

    @Query("select distinct o.contestId from OrderEntity o where o.userId = :userId")
    List<Long> findContestIdsWithEntriesByUser(@Param("userId") Long userId);

    /**
     * The waiting orders on the opposite side, oldest first.
     *
     * FIFO is the matching rule: whoever committed their tokens first gets
     * filled first. Rows are locked because the caller is about to change
     * them; the enclosing transaction already holds the contest lock, so this
     * is really belt and braces.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select o from OrderEntity o
            where o.contestId = :contestId
              and o.side = :side
              and o.remainingShares > 0
            order by o.createdAt asc, o.id asc
            """)
    List<OrderEntity> lockOpenOrders(@Param("contestId") Long contestId, @Param("side") Side side);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from OrderEntity o where o.contestId = :contestId order by o.id asc")
    List<OrderEntity> lockAllForContest(@Param("contestId") Long contestId);
}
