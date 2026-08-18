package com.predictionmarket.wallet;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface WalletRepository extends JpaRepository<Wallet, Long> {

    Optional<Wallet> findByUserId(Long userId);

    /**
     * SELECT ... FOR UPDATE on the wallet row.
     *
     * This is the guard against the classic lost update: two orders placed at
     * the same instant both reading "500 available" and both spending it. The
     * second transaction blocks here until the first commits, then re-reads the
     * real balance.
     *
     * Always call this - never findByUserId - before changing a balance.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select w from Wallet w where w.userId = :userId")
    Optional<Wallet> lockByUserId(@Param("userId") Long userId);

    @Query("select coalesce(sum(w.locked), 0) from Wallet w")
    long sumLocked();

    List<Wallet> findByUserIdIn(List<Long> userIds);
}
