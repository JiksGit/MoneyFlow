package com.moneyflow.ledger.kafka;

import com.moneyflow.ledger.domain.Transaction;
import com.moneyflow.ledger.event.TransferEvent;
import com.moneyflow.ledger.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.annotation.RetryableTopic;
import org.springframework.kafka.retrytopic.TopicSuffixingStrategy;
import org.springframework.retry.annotation.Backoff;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
public class LedgerEventConsumer {

    private final TransactionRepository transactionRepository;

    @RetryableTopic(
        attempts = "3",
        backoff = @Backoff(delay = 1000, multiplier = 2),
        topicSuffixingStrategy = TopicSuffixingStrategy.SUFFIX_WITH_INDEX_VALUE,
        dltTopicSuffix = ".DLT"
    )
    @KafkaListener(topics = "transfer.completed", groupId = "ledger-service")
    @Transactional
    public void onTransferCompleted(TransferEvent event) {
        log.info("Recording completed transfer: {}", event.getTransferId());
        // Idempotency: skip if already recorded
        if (transactionRepository.findByTransferId(event.getTransferId()).isPresent()) {
            log.warn("Duplicate transfer.completed event ignored: {}", event.getTransferId());
            return;
        }
        Transaction tx = Transaction.builder()
                .transferId(event.getTransferId())
                .fromAccountId(event.getFromAccountId())
                .toAccountId(event.getToAccountId())
                .amount(event.getAmount())
                .status("COMPLETED")
                .build();
        transactionRepository.save(tx);
    }

    @RetryableTopic(
        attempts = "3",
        backoff = @Backoff(delay = 1000, multiplier = 2),
        topicSuffixingStrategy = TopicSuffixingStrategy.SUFFIX_WITH_INDEX_VALUE,
        dltTopicSuffix = ".DLT"
    )
    @KafkaListener(topics = "transfer.failed", groupId = "ledger-service")
    @Transactional
    public void onTransferFailed(TransferEvent event) {
        log.info("Recording failed transfer: {}", event.getTransferId());
        if (transactionRepository.findByTransferId(event.getTransferId()).isPresent()) {
            log.warn("Duplicate transfer.failed event ignored: {}", event.getTransferId());
            return;
        }
        Transaction tx = Transaction.builder()
                .transferId(event.getTransferId())
                .fromAccountId(event.getFromAccountId())
                .toAccountId(event.getToAccountId())
                .amount(event.getAmount())
                .status("FAILED")
                .failureReason(event.getFailureReason())
                .build();
        transactionRepository.save(tx);
    }
}
