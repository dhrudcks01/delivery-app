package com.delivery.servicearea.web;

import com.delivery.servicearea.dto.CreateServiceAreaRequest;
import com.delivery.servicearea.dto.ServiceAreaResponse;
import com.delivery.servicearea.service.ServiceAreaService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/ops-admin/service-areas")
public class OpsAdminServiceAreaController {

    private final ServiceAreaService serviceAreaService;

    public OpsAdminServiceAreaController(ServiceAreaService serviceAreaService) {
        this.serviceAreaService = serviceAreaService;
    }

    @PostMapping
    public ResponseEntity<ServiceAreaResponse> register(@Valid @RequestBody CreateServiceAreaRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(serviceAreaService.register(request));
    }

    @PatchMapping("/{serviceAreaId}/deactivate")
    public ResponseEntity<ServiceAreaResponse> deactivate(@PathVariable Long serviceAreaId) {
        return ResponseEntity.ok(serviceAreaService.deactivate(serviceAreaId));
    }

    @GetMapping
    public ResponseEntity<Page<ServiceAreaResponse>> getForOps(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) Boolean active,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return ResponseEntity.ok(serviceAreaService.getForOps(query, active, pageable));
    }
}

