package com.delivery.address.exception;

public class AddressSearchTimeoutException extends RuntimeException {

    public AddressSearchTimeoutException(String message, Throwable cause) {
        super(message, cause);
    }
}
