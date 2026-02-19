package com.delivery.waste.web;

import com.delivery.waste.dto.WasteRequestResponse;
import com.delivery.waste.service.WasteRequestService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

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
    public ResponseEntity<WasteRequestResponse> getDetail(@PathVariable Long requestId) {
        return ResponseEntity.ok(wasteRequestService.getDetailForOps(requestId));
    }
}
