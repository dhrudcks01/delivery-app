package com.delivery.waste.web;

import com.delivery.waste.dto.DriverAssignedWasteRequestResponse;
import com.delivery.waste.dto.MeasureWasteRequest;
import com.delivery.waste.dto.WasteRequestResponse;
import com.delivery.waste.service.DriverWasteRequestService;
import jakarta.validation.Valid;
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
@RequestMapping("/driver/waste-requests")
public class DriverWasteRequestController {

    private final DriverWasteRequestService driverWasteRequestService;

    public DriverWasteRequestController(DriverWasteRequestService driverWasteRequestService) {
        this.driverWasteRequestService = driverWasteRequestService;
    }

    @GetMapping
    public ResponseEntity<List<DriverAssignedWasteRequestResponse>> getMyAssignedRequests(
            Authentication authentication
    ) {
        return ResponseEntity.ok(driverWasteRequestService.getMyAssignedRequests(authentication.getName()));
    }

    @GetMapping("/{requestId}")
    public ResponseEntity<DriverAssignedWasteRequestResponse> getMyAssignedRequest(
            Authentication authentication,
            @PathVariable Long requestId
    ) {
        return ResponseEntity.ok(driverWasteRequestService.getMyAssignedRequest(authentication.getName(), requestId));
    }

    @PostMapping("/{requestId}/measure")
    public ResponseEntity<WasteRequestResponse> measureAssignedRequest(
            Authentication authentication,
            @PathVariable Long requestId,
            @Valid @RequestBody MeasureWasteRequest request
    ) {
        return ResponseEntity.ok(driverWasteRequestService.measureAssignedRequest(
                authentication.getName(),
                requestId,
                request
        ));
    }
}
