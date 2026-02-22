package com.delivery.address.web;

import com.delivery.address.dto.AddressSearchResponse;
import com.delivery.address.service.AddressSearchService;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/addresses")
public class AddressSearchController {

    private final AddressSearchService addressSearchService;

    public AddressSearchController(AddressSearchService addressSearchService) {
        this.addressSearchService = addressSearchService;
    }

    @GetMapping("/road-search")
    public ResponseEntity<AddressSearchResponse> searchRoadAddress(
            @RequestParam @NotBlank String query,
            @RequestParam(required = false) @Min(1) Integer limit
    ) {
        return ResponseEntity.ok(addressSearchService.search(query, limit));
    }
}
