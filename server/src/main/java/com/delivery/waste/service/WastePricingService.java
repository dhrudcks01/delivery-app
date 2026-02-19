package com.delivery.waste.service;

import com.delivery.waste.config.WastePricingProperties;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
public class WastePricingService {

    private final WastePricingProperties wastePricingProperties;

    public WastePricingService(WastePricingProperties wastePricingProperties) {
        this.wastePricingProperties = wastePricingProperties;
    }

    public long calculateFinalAmount(BigDecimal measuredWeightKg) {
        if (measuredWeightKg == null || measuredWeightKg.signum() <= 0) {
            throw new IllegalArgumentException("측정 무게는 0보다 커야 합니다.");
        }

        BigDecimal amount = measuredWeightKg.multiply(BigDecimal.valueOf(wastePricingProperties.getPerKgKrw()));
        return amount.setScale(0, RoundingMode.HALF_UP).longValueExact();
    }
}
