package com.delivery.waste.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.waste.pricing")
public class WastePricingProperties {

    private long perKgKrw = 1000L;

    public long getPerKgKrw() {
        return perKgKrw;
    }

    public void setPerKgKrw(long perKgKrw) {
        this.perKgKrw = perKgKrw;
    }
}
