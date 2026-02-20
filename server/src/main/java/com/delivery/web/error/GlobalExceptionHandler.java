package com.delivery.web.error;

import java.util.List;

import com.delivery.auth.exception.DuplicateEmailException;
import com.delivery.auth.exception.InvalidCredentialsException;
import com.delivery.auth.exception.InvalidRefreshTokenException;
import com.delivery.auth.exception.UserNotFoundException;
import com.delivery.driver.exception.DriverApplicationNotFoundException;
import com.delivery.driver.exception.DriverApplicationStatusConflictException;
import com.delivery.payment.exception.InvalidPaymentMethodRegistrationException;
import com.delivery.upload.exception.InvalidUploadFileException;
import com.delivery.waste.exception.DriverRoleRequiredException;
import com.delivery.waste.exception.WasteRequestNotFoundException;
import com.delivery.waste.exception.WasteStatusTransitionConflictException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(DuplicateEmailException.class)
    public ResponseEntity<ApiErrorResponse> handleDuplicateEmail(
            DuplicateEmailException exception,
            HttpServletRequest request
    ) {
        ApiErrorResponse response = ApiErrorResponse.of(
                HttpStatus.CONFLICT.value(),
                "EMAIL_ALREADY_EXISTS",
                exception.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<ApiErrorResponse> handleInvalidCredentials(
            InvalidCredentialsException exception,
            HttpServletRequest request
    ) {
        ApiErrorResponse response = ApiErrorResponse.of(
                HttpStatus.UNAUTHORIZED.value(),
                "INVALID_CREDENTIALS",
                exception.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
    }

    @ExceptionHandler(InvalidRefreshTokenException.class)
    public ResponseEntity<ApiErrorResponse> handleInvalidRefreshToken(
            InvalidRefreshTokenException exception,
            HttpServletRequest request
    ) {
        ApiErrorResponse response = ApiErrorResponse.of(
                HttpStatus.UNAUTHORIZED.value(),
                "INVALID_REFRESH_TOKEN",
                exception.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
    }

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleUserNotFound(
            UserNotFoundException exception,
            HttpServletRequest request
    ) {
        ApiErrorResponse response = ApiErrorResponse.of(
                HttpStatus.NOT_FOUND.value(),
                "USER_NOT_FOUND",
                exception.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    @ExceptionHandler(DriverApplicationNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleDriverApplicationNotFound(
            DriverApplicationNotFoundException exception,
            HttpServletRequest request
    ) {
        ApiErrorResponse response = ApiErrorResponse.of(
                HttpStatus.NOT_FOUND.value(),
                "DRIVER_APPLICATION_NOT_FOUND",
                exception.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    @ExceptionHandler(DriverApplicationStatusConflictException.class)
    public ResponseEntity<ApiErrorResponse> handleDriverApplicationStatusConflict(
            DriverApplicationStatusConflictException exception,
            HttpServletRequest request
    ) {
        ApiErrorResponse response = ApiErrorResponse.of(
                HttpStatus.CONFLICT.value(),
                "DRIVER_APPLICATION_STATUS_CONFLICT",
                exception.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
    }

    @ExceptionHandler(WasteRequestNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleWasteRequestNotFound(
            WasteRequestNotFoundException exception,
            HttpServletRequest request
    ) {
        ApiErrorResponse response = ApiErrorResponse.of(
                HttpStatus.NOT_FOUND.value(),
                "WASTE_REQUEST_NOT_FOUND",
                exception.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    @ExceptionHandler(WasteStatusTransitionConflictException.class)
    public ResponseEntity<ApiErrorResponse> handleWasteStatusTransitionConflict(
            WasteStatusTransitionConflictException exception,
            HttpServletRequest request
    ) {
        ApiErrorResponse response = ApiErrorResponse.of(
                HttpStatus.CONFLICT.value(),
                "WASTE_STATUS_TRANSITION_CONFLICT",
                exception.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
    }

    @ExceptionHandler(DriverRoleRequiredException.class)
    public ResponseEntity<ApiErrorResponse> handleDriverRoleRequired(
            DriverRoleRequiredException exception,
            HttpServletRequest request
    ) {
        ApiErrorResponse response = ApiErrorResponse.of(
                HttpStatus.BAD_REQUEST.value(),
                "DRIVER_ROLE_REQUIRED",
                exception.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(InvalidUploadFileException.class)
    public ResponseEntity<ApiErrorResponse> handleInvalidUploadFile(
            InvalidUploadFileException exception,
            HttpServletRequest request
    ) {
        ApiErrorResponse response = ApiErrorResponse.of(
                HttpStatus.BAD_REQUEST.value(),
                "INVALID_UPLOAD_FILE",
                exception.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(InvalidPaymentMethodRegistrationException.class)
    public ResponseEntity<ApiErrorResponse> handleInvalidPaymentMethodRegistration(
            InvalidPaymentMethodRegistrationException exception,
            HttpServletRequest request
    ) {
        ApiErrorResponse response = ApiErrorResponse.of(
                HttpStatus.BAD_REQUEST.value(),
                "INVALID_PAYMENT_METHOD_REGISTRATION",
                exception.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleMethodArgumentNotValid(
            MethodArgumentNotValidException exception,
            HttpServletRequest request
    ) {
        List<ApiErrorResponse.FieldViolation> violations = exception.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(this::toViolation)
                .toList();

        ApiErrorResponse response = ApiErrorResponse.of(
                HttpStatus.BAD_REQUEST.value(),
                "VALIDATION_ERROR",
                "요청 값이 올바르지 않습니다.",
                request.getRequestURI(),
                violations
        );

        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler({
            ConstraintViolationException.class,
            MethodArgumentTypeMismatchException.class
    })
    public ResponseEntity<ApiErrorResponse> handleBadRequest(
            Exception exception,
            HttpServletRequest request
    ) {
        ApiErrorResponse response = ApiErrorResponse.of(
                HttpStatus.BAD_REQUEST.value(),
                "BAD_REQUEST",
                "잘못된 요청입니다.",
                request.getRequestURI()
        );
        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleException(
            Exception exception,
            HttpServletRequest request
    ) {
        ApiErrorResponse response = ApiErrorResponse.of(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "INTERNAL_SERVER_ERROR",
                "서버 내부 오류가 발생했습니다.",
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }

    private ApiErrorResponse.FieldViolation toViolation(FieldError error) {
        return new ApiErrorResponse.FieldViolation(error.getField(), error.getDefaultMessage());
    }
}
