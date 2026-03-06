package com.delivery.payment.dto;

import java.util.List;

public record PendingPaymentBatchExecuteResponse(
        int requestedCount,
        int succeededCount,
        int failedCount,
        int skippedCount,
        List<Item> results
) {
    public record Item(
            Long wasteRequestId,
            Long paymentId,
            String result,
            String wasteStatus,
            String paymentStatus,
            String message
    ) {
    }
}
