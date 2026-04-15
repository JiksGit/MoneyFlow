package com.moneyflow.transfer.controller;

import com.moneyflow.transfer.domain.TransferSaga;
import com.moneyflow.transfer.service.TransferSagaService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/transfers")
@RequiredArgsConstructor
public class TransferController {

    private final TransferSagaService sagaService;

    @PostMapping
    public ResponseEntity<Map<String, Object>> initiateTransfer(
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody TransferRequest request) {

        TransferSaga saga = sagaService.initiate(
                UUID.fromString(userId),
                request.getFromAccountId(),
                request.getToAccountId(),
                request.getAmount()
        );

        return ResponseEntity.status(HttpStatus.ACCEPTED).body(toMap(saga));
    }

    @GetMapping("/{transferId}")
    public ResponseEntity<Map<String, Object>> getTransfer(
            @PathVariable UUID transferId) {
        TransferSaga saga = sagaService.getSaga(transferId);
        return ResponseEntity.ok(toMap(saga));
    }

    @GetMapping
    public ResponseEntity<Page<Map<String, Object>>> getMyTransfers(
            @RequestHeader("X-User-Id") String userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Page<TransferSaga> sagas = sagaService.getMyTransfers(
                UUID.fromString(userId), PageRequest.of(page, size));
        return ResponseEntity.ok(sagas.map(this::toMap));
    }

    private Map<String, Object> toMap(TransferSaga saga) {
        return Map.of(
                "id", saga.getId(),
                "status", saga.getStatus(),
                "amount", saga.getAmount(),
                "fromAccountId", saga.getFromAccountId(),
                "toAccountId", saga.getToAccountId(),
                "failureReason", saga.getFailureReason() != null ? saga.getFailureReason() : "",
                "createdAt", saga.getCreatedAt(),
                "updatedAt", saga.getUpdatedAt() != null ? saga.getUpdatedAt() : saga.getCreatedAt()
        );
    }

    @Data
    public static class TransferRequest {
        @NotNull
        private UUID fromAccountId;

        @NotNull
        private UUID toAccountId;

        @NotNull
        @DecimalMin(value = "0.01", message = "Amount must be at least 0.01")
        private BigDecimal amount;
    }
}
