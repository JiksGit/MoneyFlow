package com.moneyflow.transfer.service;

import com.moneyflow.transfer.domain.TransferSaga;
import com.moneyflow.transfer.event.AccountEvent;
import com.moneyflow.transfer.event.TransferEvent;
import com.moneyflow.transfer.repository.TransferSagaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class TransferSagaService {

    private final TransferSagaRepository sagaRepository;
    private final KafkaTemplate<String, TransferEvent> kafkaTemplate;

    /**
     * Step 1: Create saga and publish transfer.initiated
     */
    @Transactional
    public TransferSaga initiate(UUID fromUserId, UUID fromAccountId, UUID toAccountId, BigDecimal amount) {
        TransferSaga saga = TransferSaga.builder()
                .fromUserId(fromUserId)
                .fromAccountId(fromAccountId)
                .toAccountId(toAccountId)
                .amount(amount)
                .status(TransferSaga.Status.INITIATED)
                .build();
        saga = sagaRepository.save(saga);

        TransferEvent event = buildEvent(saga, "INITIATED");
        kafkaTemplate.send("transfer.initiated", saga.getId().toString(), event);

        log.info("Saga INITIATED: id={}, from={}, to={}, amount={}", saga.getId(), fromAccountId, toAccountId, amount);
        return saga;
    }

    /**
     * Step 2a: Debit succeeded → request credit
     */
    @Transactional
    public void onDebited(AccountEvent event) {
        TransferSaga saga = findSaga(event.getTransferId());
        if (saga.getStatus() != TransferSaga.Status.INITIATED) {
            log.warn("Unexpected state for DEBITED: sagaId={}, status={}", saga.getId(), saga.getStatus());
            return;
        }

        saga.transitionTo(TransferSaga.Status.DEBITED);
        sagaRepository.save(saga);

        // Request credit
        TransferEvent creditEvent = buildEvent(saga, "CREDIT_REQUESTED");
        kafkaTemplate.send("transfer.credit.requested", saga.getId().toString(), creditEvent);
        log.info("Saga DEBITED → requesting credit: id={}", saga.getId());
    }

    /**
     * Step 2b: Debit failed → mark FAILED (no compensation needed — debit never happened)
     */
    @Transactional
    public void onDebitFailed(AccountEvent event) {
        TransferSaga saga = findSaga(event.getTransferId());

        saga.fail(event.getFailureReason());
        sagaRepository.save(saga);

        TransferEvent failedEvent = buildEvent(saga, "FAILED");
        failedEvent.setFailureReason(event.getFailureReason());
        kafkaTemplate.send("transfer.failed", saga.getId().toString(), failedEvent);
        log.info("Saga FAILED (debit failed): id={}, reason={}", saga.getId(), event.getFailureReason());
    }

    /**
     * Step 3a: Credit succeeded → COMPLETED
     */
    @Transactional
    public void onCredited(AccountEvent event) {
        TransferSaga saga = findSaga(event.getTransferId());
        if (saga.getStatus() != TransferSaga.Status.DEBITED) {
            log.warn("Unexpected state for CREDITED: sagaId={}, status={}", saga.getId(), saga.getStatus());
            return;
        }

        saga.transitionTo(TransferSaga.Status.COMPLETED);
        sagaRepository.save(saga);

        TransferEvent completedEvent = buildEvent(saga, "COMPLETED");
        kafkaTemplate.send("transfer.completed", saga.getId().toString(), completedEvent);
        log.info("Saga COMPLETED: id={}", saga.getId());
    }

    /**
     * Step 3b: Credit failed → start compensation
     */
    @Transactional
    public void onCreditFailed(AccountEvent event) {
        TransferSaga saga = findSaga(event.getTransferId());

        saga.transitionTo(TransferSaga.Status.COMPENSATING);
        saga.setFailureReason(event.getFailureReason());
        sagaRepository.save(saga);

        TransferEvent compensateEvent = buildEvent(saga, "COMPENSATE");
        kafkaTemplate.send("transfer.compensate", saga.getId().toString(), compensateEvent);
        log.info("Saga COMPENSATING: id={}, reason={}", saga.getId(), event.getFailureReason());
    }

    /**
     * Step 4: Compensation complete → FAILED
     */
    @Transactional
    public void onCompensated(AccountEvent event) {
        TransferSaga saga = findSaga(event.getTransferId());

        saga.transitionTo(TransferSaga.Status.COMPENSATED);
        sagaRepository.save(saga);

        // Final FAILED event after compensation
        TransferEvent failedEvent = buildEvent(saga, "FAILED");
        failedEvent.setFailureReason(saga.getFailureReason());
        kafkaTemplate.send("transfer.failed", saga.getId().toString(), failedEvent);
        log.info("Saga COMPENSATED → FAILED: id={}", saga.getId());
    }

    @Transactional(readOnly = true)
    public TransferSaga getSaga(UUID transferId) {
        return findSaga(transferId);
    }

    @Transactional(readOnly = true)
    public Page<TransferSaga> getMyTransfers(UUID userId, Pageable pageable) {
        return sagaRepository.findByFromUserIdOrderByCreatedAtDesc(userId, pageable);
    }

    private TransferSaga findSaga(UUID transferId) {
        return sagaRepository.findById(transferId)
                .orElseThrow(() -> new IllegalArgumentException("Transfer saga not found: " + transferId));
    }

    private TransferEvent buildEvent(TransferSaga saga, String eventType) {
        return TransferEvent.builder()
                .transferId(saga.getId())
                .fromAccountId(saga.getFromAccountId())
                .toAccountId(saga.getToAccountId())
                .fromUserId(saga.getFromUserId())
                .amount(saga.getAmount())
                .eventType(eventType)
                .status(saga.getStatus().name())
                .build();
    }
}
