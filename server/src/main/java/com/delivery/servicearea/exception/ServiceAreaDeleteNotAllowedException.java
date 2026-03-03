package com.delivery.servicearea.exception;

public class ServiceAreaDeleteNotAllowedException extends RuntimeException {

    public ServiceAreaDeleteNotAllowedException(String message) {
        super(message);
    }
}
