package com.moneyflow.account.kafka;

import com.moneyflow.account.event.TransferEvent;
import com.moneyflow.account.service.AccountService;
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
public class TransferEventConsumer {

    private final AccountService accountService;

    @RetryableTopic(
        attempts = "3",
        backoff = @Backoff(delay = 1000, multiplier = 2),
        topicSuffixingStrategy = TopicSuffixingStrategy.SUFFIX_WITH_INDEX_VALUE,
        dltTopicSuffix = ".DLT"
    )
    @KafkaListener(topics = "transfer.initiated", groupId = "account-service")
    public void onTransferInitiated(TransferEvent event) {
        log.info("Received transfer.initiated: transferId={}", event.getTransferId());
        accountService.processDebit(event);
    }

    @RetryableTopic(
        attempts = "3",
        backoff = @Backoff(delay = 1000, multiplier = 2),
        topicSuffixingStrategy = TopicSuffixingStrategy.SUFFIX_WITH_INDEX_VALUE,
        dltTopicSuffix = ".DLT"
    )
    @KafkaListener(topics = "transfer.credit.requested", groupId = "account-service")
    public void onCreditRequested(TransferEvent event) {
        log.info("Received transfer.credit.requested: transferId={}", event.getTransferId());
        accountService.processCredit(event);
    }

    @RetryableTopic(
        attempts = "3",
        backoff = @Backoff(delay = 1000, multiplier = 2),
        topicSuffixingStrategy = TopicSuffixingStrategy.SUFFIX_WITH_INDEX_VALUE,
        dltTopicSuffix = ".DLT"
    )
    @KafkaListener(topics = "transfer.compensate", groupId = "account-service")
    public void onCompensate(TransferEvent event) {
        log.info("Received transfer.compensate: transferId={}", event.getTransferId());
        accountService.processCompensate(event);
    }
}
