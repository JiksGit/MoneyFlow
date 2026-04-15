package com.moneyflow.ledger.repository;

import com.moneyflow.ledger.domain.Transaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface TransactionRepository extends JpaRepository<Transaction, UUID> {

    Optional<Transaction> findByTransferId(UUID transferId);

    @Query("SELECT t FROM Transaction t WHERE t.fromAccountId = :accountId OR t.toAccountId = :accountId ORDER BY t.recordedAt DESC")
    Page<Transaction> findByAccountId(UUID accountId, Pageable pageable);

    Page<Transaction> findByFromAccountIdOrderByRecordedAtDesc(UUID fromAccountId, Pageable pageable);
}
