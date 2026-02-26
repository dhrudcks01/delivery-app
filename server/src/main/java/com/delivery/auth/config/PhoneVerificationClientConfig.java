package com.delivery.auth.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

@Configuration
public class PhoneVerificationClientConfig {

    @Bean
    @Qualifier("phoneVerificationRestTemplate")
    public RestTemplate phoneVerificationRestTemplate(
            RestTemplateBuilder restTemplateBuilder,
            PhoneVerificationProperties phoneVerificationProperties
    ) {
        return restTemplateBuilder
                .setConnectTimeout(Duration.ofMillis(phoneVerificationProperties.getConnectTimeoutMillis()))
                .setReadTimeout(Duration.ofMillis(phoneVerificationProperties.getReadTimeoutMillis()))
                .build();
    }
}
