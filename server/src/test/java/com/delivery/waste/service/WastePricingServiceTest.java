package com.delivery.waste.service;

import com.delivery.waste.config.WastePricingProperties;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class WastePricingServiceTest {

    @Test
    void calculateFinalAmountReturnsWeightTimesUnitPrice() {
        WastePricingProperties properties = new WastePricingProperties();
        properties.setPerKgKrw(1000L);
        WastePricingService service = new WastePricingService(properties);

        long amount = service.calculateFinalAmount(new BigDecimal("3.750"));

        assertThat(amount).isEqualTo(3750L);
    }

    @Test
    void calculateFinalAmountUsesConfiguredUnitPrice() {
        WastePricingProperties properties = new WastePricingProperties();
        properties.setPerKgKrw(1200L);
        WastePricingService service = new WastePricingService(properties);

        long amount = service.calculateFinalAmount(new BigDecimal("2.500"));

        assertThat(amount).isEqualTo(3000L);
    }
}
