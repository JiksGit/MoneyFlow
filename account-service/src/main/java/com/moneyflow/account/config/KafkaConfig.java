package com.moneyflow.account.config;

import com.moneyflow.account.event.AccountEvent;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;

@Configuration
public class KafkaConfig {

    @Bean
    public KafkaTemplate<String, AccountEvent> kafkaTemplate(ProducerFactory<String, AccountEvent> pf) {
        return new KafkaTemplate<>(pf);
    }
}
