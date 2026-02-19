package com.delivery.web;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
class TestRbacController {

    @GetMapping("/user/secure")
    ResponseEntity<Void> userSecure() {
        return ResponseEntity.ok().build();
    }

    @GetMapping("/driver/secure")
    ResponseEntity<Void> driverSecure() {
        return ResponseEntity.ok().build();
    }

    @GetMapping("/ops-admin/secure")
    ResponseEntity<Void> opsAdminSecure() {
        return ResponseEntity.ok().build();
    }

    @GetMapping("/sys-admin/secure")
    ResponseEntity<Void> sysAdminSecure() {
        return ResponseEntity.ok().build();
    }
}
