package com.predictionmarket.wallet;

import com.predictionmarket.common.Enums.TxType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, Long> {

    List<WalletTransaction> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<WalletTransaction> findAllByOrderByCreatedAtDesc();

    @Query("select coalesce(sum(t.amount), 0) from WalletTransaction t where t.type = :type")
    long sumByType(@Param("type") TxType type);
}
