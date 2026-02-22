package com.delivery.address.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

@Configuration
public class AddressSearchClientConfig {

    @Bean
    @Qualifier("addressSearchRestTemplate")
    public RestTemplate addressSearchRestTemplate(
            RestTemplateBuilder restTemplateBuilder,
            AddressSearchProperties addressSearchProperties
    ) {
        return restTemplateBuilder
                .setConnectTimeout(Duration.ofMillis(addressSearchProperties.getConnectTimeoutMillis()))
                .setReadTimeout(Duration.ofMillis(addressSearchProperties.getReadTimeoutMillis()))
                .build();
    }
}
