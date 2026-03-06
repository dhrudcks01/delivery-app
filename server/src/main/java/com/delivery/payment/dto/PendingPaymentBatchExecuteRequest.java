package com.delivery.payment.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

public record PendingPaymentBatchExecuteRequest(
        @Schema(
                description = "결제 실행 대상 wasteRequestId 목록. 비어 있으면 현재 PAYMENT_PENDING 전체를 실행한다."
        )
        List<Long> wasteRequestIds
) {
}
