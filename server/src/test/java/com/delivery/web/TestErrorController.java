package com.delivery.web;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/test/errors")
class TestErrorController {

    @PostMapping("/validation")
    ResponseEntity<Void> validation(@Valid @RequestBody ValidationRequest request) {
        return ResponseEntity.ok().build();
    }

    @GetMapping("/runtime")
    ResponseEntity<Void> runtimeError() {
        throw new IllegalStateException("forced error");
    }

    record ValidationRequest(@NotBlank(message = "name은 필수입니다.") String name) {
    }
}
