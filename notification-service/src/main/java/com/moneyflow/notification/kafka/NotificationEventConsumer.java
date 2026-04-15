package com.moneyflow.notification.kafka;

import com.moneyflow.notification.event.TransferEvent;
import com.moneyflow.notification.service.SseEmitterService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.annotation.RetryableTopic;
import org.springframework.kafka.retrytopic.TopicSuffixingStrategy;
import org.springframework.retry.annotation.Backoff;
import org.springframework.stereotype.Component;

import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationEventConsumer {

    private final SseEmitterService sseEmitterService;

    @RetryableTopic(
        attempts = "3",
        backoff = @Backoff(delay = 1000, multiplier = 2),
        topicSuffixingStrategy = TopicSuffixingStrategy.SUFFIX_WITH_INDEX_VALUE,
        dltTopicSuffix = ".DLT"
    )
    @KafkaListener(topics = "transfer.completed", groupId = "notification-service")
    public void onTransferCompleted(TransferEvent event) {
        log.info("Sending completion notification for transfer: {}", event.getTransferId());
        Map<String, Object> notification = Map.of(
                "type", "TRANSFER_COMPLETED",
                "transferId", event.getTransferId(),
                "amount", event.getAmount(),
                "fromAccountId", event.getFromAccountId(),
                "toAccountId", event.getToAccountId()
        );
        if (event.getFromUserId() != null) {
            sseEmitterService.sendToUser(event.getFromUserId(), "transfer.completed", notification);
        }
    }

    @RetryableTopic(
        attempts = "3",
        backoff = @Backoff(delay = 1000, multiplier = 2),
        topicSuffixingStrategy = TopicSuffixingStrategy.SUFFIX_WITH_INDEX_VALUE,
        dltTopicSuffix = ".DLT"
    )
    @KafkaListener(topics = "transfer.failed", groupId = "notification-service")
    public void onTransferFailed(TransferEvent event) {
        log.info("Sending failure notification for transfer: {}", event.getTransferId());
        Map<String, Object> notification = Map.of(
                "type", "TRANSFER_FAILED",
                "transferId", event.getTransferId(),
                "amount", event.getAmount(),
                "reason", event.getFailureReason() != null ? event.getFailureReason() : "Unknown error"
        );
        if (event.getFromUserId() != null) {
            sseEmitterService.sendToUser(event.getFromUserId(), "transfer.failed", notification);
        }
    }
}
