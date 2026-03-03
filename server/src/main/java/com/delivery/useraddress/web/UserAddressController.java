package com.delivery.useraddress.web;

import com.delivery.useraddress.dto.UserAddressResponse;
import com.delivery.useraddress.dto.UserAddressUpsertRequest;
import com.delivery.useraddress.service.UserAddressService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/user/addresses")
public class UserAddressController {

    private final UserAddressService userAddressService;

    public UserAddressController(UserAddressService userAddressService) {
        this.userAddressService = userAddressService;
    }

    @GetMapping
    public ResponseEntity<List<UserAddressResponse>> getMyAddresses(Authentication authentication) {
        return ResponseEntity.ok(userAddressService.getMyAddresses(authentication.getName()));
    }

    @PostMapping
    public ResponseEntity<UserAddressResponse> createAddress(
            Authentication authentication,
            @Valid @RequestBody UserAddressUpsertRequest request
    ) {
        UserAddressResponse response = userAddressService.createAddress(authentication.getName(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PatchMapping("/{addressId}")
    public ResponseEntity<UserAddressResponse> updateAddress(
            Authentication authentication,
            @PathVariable Long addressId,
            @Valid @RequestBody UserAddressUpsertRequest request
    ) {
        return ResponseEntity.ok(userAddressService.updateAddress(authentication.getName(), addressId, request));
    }

    @PatchMapping("/{addressId}/primary")
    public ResponseEntity<UserAddressResponse> setPrimaryAddress(
            Authentication authentication,
            @PathVariable Long addressId
    ) {
        return ResponseEntity.ok(userAddressService.setPrimaryAddress(authentication.getName(), addressId));
    }

    @DeleteMapping("/{addressId}")
    public ResponseEntity<Void> deleteAddress(
            Authentication authentication,
            @PathVariable Long addressId
    ) {
        userAddressService.deleteAddress(authentication.getName(), addressId);
        return ResponseEntity.noContent().build();
    }
}

