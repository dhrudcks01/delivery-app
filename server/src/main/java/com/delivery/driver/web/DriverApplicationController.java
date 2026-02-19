package com.delivery.driver.web;

import com.delivery.driver.dto.CreateDriverApplicationRequest;
import com.delivery.driver.dto.DriverApplicationResponse;
import com.delivery.driver.service.DriverApplicationService;
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
@RequestMapping("/user/driver-applications")
public class DriverApplicationController {

    private final DriverApplicationService driverApplicationService;

    public DriverApplicationController(DriverApplicationService driverApplicationService) {
        this.driverApplicationService = driverApplicationService;
    }

    @PostMapping
    public ResponseEntity<DriverApplicationResponse> create(
            Authentication authentication,
            @Valid @RequestBody CreateDriverApplicationRequest request
    ) {
        DriverApplicationResponse response = driverApplicationService.create(authentication.getName(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<DriverApplicationResponse>> getMyApplications(Authentication authentication) {
        return ResponseEntity.ok(driverApplicationService.getMyApplications(authentication.getName()));
    }

    @GetMapping("/{applicationId}")
    public ResponseEntity<DriverApplicationResponse> getMyApplication(
            Authentication authentication,
            @PathVariable Long applicationId
    ) {
        return ResponseEntity.ok(driverApplicationService.getMyApplication(authentication.getName(), applicationId));
    }
}
