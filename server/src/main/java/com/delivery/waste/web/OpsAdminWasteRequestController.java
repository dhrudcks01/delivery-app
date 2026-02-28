package com.delivery.waste.web;

import com.delivery.waste.dto.AssignWasteRequest;
import com.delivery.waste.dto.DriverAssignmentCandidateResponse;
import com.delivery.waste.dto.WasteRequestDetailResponse;
import com.delivery.waste.dto.WasteRequestResponse;
import com.delivery.waste.service.WasteRequestService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.Authentication;

@RestController
@RequestMapping("/ops-admin/waste-requests")
public class OpsAdminWasteRequestController {

    private final WasteRequestService wasteRequestService;

    public OpsAdminWasteRequestController(WasteRequestService wasteRequestService) {
        this.wasteRequestService = wasteRequestService;
    }

    @GetMapping
    public ResponseEntity<Page<WasteRequestResponse>> getAll(
            @RequestParam(required = false) String status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(wasteRequestService.getAllForOps(status, pageable));
    }

    @GetMapping("/{requestId}")
    public ResponseEntity<WasteRequestDetailResponse> getDetail(@PathVariable Long requestId) {
        return ResponseEntity.ok(wasteRequestService.getDetailForOps(requestId));
    }

    @GetMapping("/driver-candidates")
    public ResponseEntity<Page<DriverAssignmentCandidateResponse>> getDriverCandidates(
            @RequestParam(required = false) String query,
            @PageableDefault(size = 20, sort = "driverId", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(wasteRequestService.getDriverCandidatesForOps(query, pageable));
    }

    @PostMapping("/{requestId}/assign")
    public ResponseEntity<WasteRequestResponse> assign(
            Authentication authentication,
            @PathVariable Long requestId,
            @Valid @RequestBody AssignWasteRequest request
    ) {
        return ResponseEntity.ok(wasteRequestService.assignForOps(requestId, request, authentication.getName()));
    }
}
