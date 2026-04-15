package com.moneyflow.transfer.kafka;

import com.moneyflow.transfer.event.AccountEvent;
import com.moneyflow.transfer.service.TransferSagaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.annotation.RetryableTopic;
import org.springframework.kafka.retrytopic.TopicSuffixingStrategy;
import org.springframework.retry.annotation.Backoff;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class SagaEventConsumer {

    private final TransferSagaService sagaService;

    @RetryableTopic(
        attempts = "3",
        backoff = @Backoff(delay = 1000, multiplier = 2),
        topicSuffixingStrategy = TopicSuffixingStrategy.SUFFIX_WITH_INDEX_VALUE,
        dltTopicSuffix = ".DLT"
    )
    @KafkaListener(topics = "transfer.debited", groupId = "transfer-service")
    public void onAccountDebited(AccountEvent event) {
        log.info("Received transfer.debited: transferId={}, type={}", event.getTransferId(), event.getEventType());
        if ("DEBITED".equals(event.getEventType())) {
            sagaService.onDebited(event);
        } else if ("DEBIT_FAILED".equals(event.getEventType())) {
            sagaService.onDebitFailed(event);
        }
    }

    @RetryableTopic(
        attempts = "3",
        backoff = @Backoff(delay = 1000, multiplier = 2),
        topicSuffixingStrategy = TopicSuffixingStrategy.SUFFIX_WITH_INDEX_VALUE,
        dltTopicSuffix = ".DLT"
    )
    @KafkaListener(topics = "transfer.credited", groupId = "transfer-service")
    public void onAccountCredited(AccountEvent event) {
        log.info("Received transfer.credited: transferId={}, type={}", event.getTransferId(), event.getEventType());
        if ("CREDITED".equals(event.getEventType())) {
            sagaService.onCredited(event);
        } else if ("CREDIT_FAILED".equals(event.getEventType())) {
            sagaService.onCreditFailed(event);
        }
    }

    @RetryableTopic(
        attempts = "3",
        backoff = @Backoff(delay = 1000, multiplier = 2),
        topicSuffixingStrategy = TopicSuffixingStrategy.SUFFIX_WITH_INDEX_VALUE,
        dltTopicSuffix = ".DLT"
    )
    @KafkaListener(topics = "transfer.compensated", groupId = "transfer-service")
    public void onAccountCompensated(AccountEvent event) {
        log.info("Received transfer.compensated: transferId={}", event.getTransferId());
        sagaService.onCompensated(event);
    }
}
