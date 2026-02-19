package com.delivery.waste.web;

import com.delivery.waste.dto.CreateWasteRequestRequest;
import com.delivery.waste.dto.WasteRequestResponse;
import com.delivery.waste.service.WasteRequestService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/waste-requests")
public class WasteRequestController {

    private final WasteRequestService wasteRequestService;

    public WasteRequestController(WasteRequestService wasteRequestService) {
        this.wasteRequestService = wasteRequestService;
    }

    @PostMapping
    public ResponseEntity<WasteRequestResponse> create(
            Authentication authentication,
            @Valid @RequestBody CreateWasteRequestRequest request
    ) {
        WasteRequestResponse response = wasteRequestService.create(authentication.getName(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<WasteRequestResponse>> getMyRequests(Authentication authentication) {
        return ResponseEntity.ok(wasteRequestService.getMyRequests(authentication.getName()));
    }

    @GetMapping("/{requestId}")
    public ResponseEntity<WasteRequestResponse> getMyRequest(
            Authentication authentication,
            @PathVariable Long requestId
    ) {
        return ResponseEntity.ok(wasteRequestService.getMyRequest(authentication.getName(), requestId));
    }

    @PostMapping("/{requestId}/cancel")
    public ResponseEntity<WasteRequestResponse> cancelMyRequest(
            Authentication authentication,
            @PathVariable Long requestId
    ) {
        return ResponseEntity.ok(wasteRequestService.cancelMyRequest(authentication.getName(), requestId));
    }
}
