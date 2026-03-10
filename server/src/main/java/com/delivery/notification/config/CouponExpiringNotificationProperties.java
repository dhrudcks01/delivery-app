package com.delivery.notification.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@ConfigurationProperties(prefix = "app.notification.coupon-expiring")
public class CouponExpiringNotificationProperties {

    private static final String DEFAULT_SCHEDULE_CRON = "0 0 10 * * *";
    private static final List<Integer> DEFAULT_DAYS_BEFORE_EXPIRY = List.of(3, 1);
    private static final int DEFAULT_BATCH_SIZE = 500;

    private boolean enabled = false;
    private String scheduleCron = DEFAULT_SCHEDULE_CRON;
    private List<Integer> daysBeforeExpiry = DEFAULT_DAYS_BEFORE_EXPIRY;
    private int batchSize = DEFAULT_BATCH_SIZE;

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getScheduleCron() {
        return scheduleCron;
    }

    public void setScheduleCron(String scheduleCron) {
        if (scheduleCron == null || scheduleCron.isBlank()) {
            this.scheduleCron = DEFAULT_SCHEDULE_CRON;
            return;
        }
        this.scheduleCron = scheduleCron;
    }

    public List<Integer> getDaysBeforeExpiry() {
        return daysBeforeExpiry;
    }

    public void setDaysBeforeExpiry(List<Integer> daysBeforeExpiry) {
        if (daysBeforeExpiry == null || daysBeforeExpiry.isEmpty()) {
            this.daysBeforeExpiry = DEFAULT_DAYS_BEFORE_EXPIRY;
            return;
        }
        this.daysBeforeExpiry = List.copyOf(daysBeforeExpiry);
    }

    public int getBatchSize() {
        return batchSize;
    }

    public void setBatchSize(int batchSize) {
        if (batchSize <= 0) {
            this.batchSize = DEFAULT_BATCH_SIZE;
            return;
        }
        this.batchSize = batchSize;
    }
}
