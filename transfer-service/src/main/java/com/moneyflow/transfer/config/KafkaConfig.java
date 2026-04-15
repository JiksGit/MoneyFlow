package com.moneyflow.transfer.config;

import com.moneyflow.transfer.event.TransferEvent;
import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;

@Configuration
public class KafkaConfig {

    @Bean
    public NewTopic transferInitiated()    { return TopicBuilder.name("transfer.initiated").partitions(3).replicas(1).build(); }
    @Bean
    public NewTopic transferDebited()      { return TopicBuilder.name("transfer.debited").partitions(3).replicas(1).build(); }
    @Bean
    public NewTopic transferCredited()     { return TopicBuilder.name("transfer.credited").partitions(3).replicas(1).build(); }
    @Bean
    public NewTopic transferCreditReq()    { return TopicBuilder.name("transfer.credit.requested").partitions(3).replicas(1).build(); }
    @Bean
    public NewTopic transferCompleted()    { return TopicBuilder.name("transfer.completed").partitions(3).replicas(1).build(); }
    @Bean
    public NewTopic transferFailed()       { return TopicBuilder.name("transfer.failed").partitions(3).replicas(1).build(); }
    @Bean
    public NewTopic transferCompensate()   { return TopicBuilder.name("transfer.compensate").partitions(3).replicas(1).build(); }
    @Bean
    public NewTopic transferCompensated()  { return TopicBuilder.name("transfer.compensated").partitions(3).replicas(1).build(); }

    @Bean
    public KafkaTemplate<String, TransferEvent> kafkaTemplate(ProducerFactory<String, TransferEvent> pf) {
        return new KafkaTemplate<>(pf);
    }
}
