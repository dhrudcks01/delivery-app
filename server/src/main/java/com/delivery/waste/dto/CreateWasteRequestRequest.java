package com.delivery.waste.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CreateWasteRequestRequest(
        @Schema(description = "Pickup address", example = "Seoul Mapo-gu Seogyo-dong Worldcup-ro 1")
        @NotBlank @Size(max = 255) String address,
        @Schema(description = "Request note", example = "Leave at the security office")
        @Size(max = 1000) String note,
        @Schema(description = "Disposal item list", example = "[\"GENERAL\", \"RECYCLE\"]")
        List<@NotBlank @Size(max = 100) String> disposalItems,
        @Schema(description = "Requested bag count", example = "2")
        @Min(0) Integer bagCount
) {

    public List<String> normalizedDisposalItems() {
        return disposalItems == null ? List.of() : disposalItems;
    }

    public int normalizedBagCount() {
        return bagCount == null ? 0 : bagCount;
    }
}
