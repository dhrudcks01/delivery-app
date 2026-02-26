package com.delivery.servicearea.web;

import com.delivery.servicearea.dto.ServiceAreaResponse;
import com.delivery.servicearea.service.ServiceAreaService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/user/service-areas")
public class UserServiceAreaController {

    private final ServiceAreaService serviceAreaService;

    public UserServiceAreaController(ServiceAreaService serviceAreaService) {
        this.serviceAreaService = serviceAreaService;
    }

    @GetMapping
    public ResponseEntity<Page<ServiceAreaResponse>> getAvailableServiceAreas(
            @RequestParam(required = false) String query,
            @PageableDefault(size = 20, sort = "city", direction = Sort.Direction.ASC) Pageable pageable
    ) {
        return ResponseEntity.ok(serviceAreaService.getForUser(query, pageable));
    }
}

