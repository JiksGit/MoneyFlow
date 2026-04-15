package com.moneyflow.ledger.controller;

import com.moneyflow.ledger.domain.Transaction;
import com.moneyflow.ledger.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/ledger")
@RequiredArgsConstructor
public class LedgerController {

    private final TransactionRepository transactionRepository;

    @GetMapping("/account/{accountId}")
    public ResponseEntity<Page<Map<String, Object>>> getByAccount(
            @PathVariable UUID accountId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Page<Transaction> txs = transactionRepository.findByAccountId(accountId, PageRequest.of(page, size));
        return ResponseEntity.ok(txs.map(this::toMap));
    }

    @GetMapping("/{transferId}")
    public ResponseEntity<Map<String, Object>> getByTransferId(@PathVariable UUID transferId) {
        return transactionRepository.findByTransferId(transferId)
                .map(tx -> ResponseEntity.ok(toMap(tx)))
                .orElse(ResponseEntity.notFound().build());
    }

    private Map<String, Object> toMap(Transaction tx) {
        return Map.of(
                "id", tx.getId(),
                "transferId", tx.getTransferId(),
                "fromAccountId", tx.getFromAccountId(),
                "toAccountId", tx.getToAccountId(),
                "amount", tx.getAmount(),
                "status", tx.getStatus(),
                "failureReason", tx.getFailureReason() != null ? tx.getFailureReason() : "",
                "recordedAt", tx.getRecordedAt()
        );
    }
}
