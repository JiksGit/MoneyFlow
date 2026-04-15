package com.moneyflow.transfer.repository;

import com.moneyflow.transfer.domain.TransferSaga;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface TransferSagaRepository extends JpaRepository<TransferSaga, UUID> {
    Page<TransferSaga> findByFromUserIdOrderByCreatedAtDesc(UUID fromUserId, Pageable pageable);
}
