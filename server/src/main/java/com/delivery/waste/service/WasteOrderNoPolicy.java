package com.delivery.waste.service;

import java.util.Objects;

public final class WasteOrderNoPolicy {

    private WasteOrderNoPolicy() {
    }

    public static String generate(Long requestId) {
        long id = Objects.requireNonNull(requestId, "requestId must not be null");
        if (id < 1_000_000L) {
            return "WR-%06d".formatted(id);
        }
        return "WR-" + id;
    }

    public static String resolve(String orderNo, Long requestId) {
        if (orderNo != null && !orderNo.isBlank()) {
            return orderNo;
        }
        return generate(requestId);
    }
}
