package com.delivery.waste.service;

import com.delivery.waste.config.WastePricingProperties;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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

    @Test
    void calculateFinalAmountRoundsHalfUpToWholeWon() {
        WastePricingProperties properties = new WastePricingProperties();
        properties.setPerKgKrw(999L);
        WastePricingService service = new WastePricingService(properties);

        long amount = service.calculateFinalAmount(new BigDecimal("1.234"));

        assertThat(amount).isEqualTo(1233L);
    }

    @Test
    void calculateFinalAmountThrowsWhenWeightIsNullOrNotPositive() {
        WastePricingProperties properties = new WastePricingProperties();
        properties.setPerKgKrw(1000L);
        WastePricingService service = new WastePricingService(properties);

        assertThatThrownBy(() -> service.calculateFinalAmount(null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("측정 무게는 0보다 커야 합니다.");
        assertThatThrownBy(() -> service.calculateFinalAmount(new BigDecimal("0.000")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("측정 무게는 0보다 커야 합니다.");
        assertThatThrownBy(() -> service.calculateFinalAmount(new BigDecimal("-1.000")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("측정 무게는 0보다 커야 합니다.");
    }
}
