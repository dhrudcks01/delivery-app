package com.delivery;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class DeliveryServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(DeliveryServerApplication.class, args);
    }
}
