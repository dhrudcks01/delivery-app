package com.delivery.notification.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

@Configuration
public class ExpoPushClientConfig {

    @Bean
    @Qualifier("expoPushRestTemplate")
    public RestTemplate expoPushRestTemplate(
            RestTemplateBuilder restTemplateBuilder,
            ExpoPushProperties expoPushProperties
    ) {
        return restTemplateBuilder
                .setConnectTimeout(Duration.ofMillis(expoPushProperties.getConnectTimeoutMillis()))
                .setReadTimeout(Duration.ofMillis(expoPushProperties.getReadTimeoutMillis()))
                .build();
    }
}
