package com.delivery.waste.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CreateWasteRequestRequest(
        @Schema(description = "수거 주소", example = "서울시 중구 세종대로 1")
        @NotBlank @Size(max = 255) String address,
        @Schema(description = "연락처", example = "010-1234-5678")
        @NotBlank @Size(max = 30) String contactPhone,
        @Schema(description = "요청사항", example = "경비실에 맡겨주세요.")
        @Size(max = 1000) String note,
        @Schema(description = "배출품목 목록(최소 1개 이상 권장)", example = "[\"일반쓰레기\", \"재활용\"]")
        List<@NotBlank @Size(max = 100) String> disposalItems,
        @Schema(description = "수거비닐 수량(0 이상)", example = "2")
        @Min(0) Integer bagCount
) {

    public List<String> normalizedDisposalItems() {
        return disposalItems == null ? List.of() : disposalItems;
    }

    public int normalizedBagCount() {
        return bagCount == null ? 0 : bagCount;
    }
}
