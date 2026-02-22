package com.delivery.address.dto;

import java.util.List;

public record AddressSearchResponse(
        String query,
        int limit,
        List<AddressItem> results
) {

    public record AddressItem(
            String roadAddress,
            String jibunAddress,
            String zipCode
    ) {
    }
}
