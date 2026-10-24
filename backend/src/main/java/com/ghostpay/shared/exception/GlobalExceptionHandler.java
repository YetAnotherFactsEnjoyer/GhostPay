package com.ghostpay.shared.exception;

import com.ghostpay.identity.domain.exception.EmailAlreadyUsedException;
import com.ghostpay.identity.domain.exception.InvalidCredentialsException;
import com.ghostpay.identity.domain.exception.InvalidPasswordException;
import com.ghostpay.identity.domain.exception.UserNotFoundException;
import com.ghostpay.merchant.domain.exception.MerchantNotFoundException;
import com.ghostpay.sync.domain.exception.BatchConflictException;
import com.ghostpay.terminal.domain.exception.TerminalDisabledException;
import com.ghostpay.terminal.domain.exception.TerminalNotFoundException;
import jakarta.validation.ConstraintViolationException;
import java.time.Instant;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BatchConflictException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ApiError handleBatchConflictException(BatchConflictException exception) {
        return new ApiError("BATCH_CONFLICT", exception.getMessage(), Instant.now());
    }

    @ExceptionHandler(TerminalDisabledException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ApiError handleTerminalDisabledException(TerminalDisabledException exception) {
        return new ApiError("TERMINAL_DISABLED", exception.getMessage(), Instant.now());
    }

    @ExceptionHandler(TerminalNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiError handleTerminalNotFoundException(TerminalNotFoundException exception) {
        return new ApiError("TERMINAL_NOT_FOUND", exception.getMessage(), Instant.now());
    }

    @ExceptionHandler(EmailAlreadyUsedException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ApiError handleEmailAlreadyUsed(EmailAlreadyUsedException exception) {
        return new ApiError("EMAIL_ALREADY_USED", exception.getMessage(), Instant.now());
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public ApiError handleInvalidCredentials(InvalidCredentialsException exception) {
        return new ApiError("INVALID_CREDENTIALS", exception.getMessage(), Instant.now());
    }

    @ExceptionHandler(UserNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiError handleUserNotFound(UserNotFoundException exception) {
        return new ApiError("USER_NOT_FOUND", exception.getMessage(), Instant.now());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiError handleInvalidRequest(MethodArgumentNotValidException exception) {
        String message = "Invalid request";

        if (!exception.getBindingResult().getFieldErrors().isEmpty()) {
            var fieldError = exception.getBindingResult().getFieldErrors().getFirst();
            message = fieldError.getField() + ": " + fieldError.getDefaultMessage();
        }

        return new ApiError(
            "VALIDATION_FAILED",
            message,
            Instant.now()
        );
    }

    @ExceptionHandler(InvalidPasswordException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiError handleInvalidPassword(InvalidPasswordException exception) {
        return new ApiError("INVALID_PASSWORD", exception.getMessage(), Instant.now());
    }

    @ExceptionHandler(MerchantNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ApiError handleMerchantNotFound(MerchantNotFoundException exception) {
        return new ApiError("MERCHANT_NOT_FOUND", exception.getMessage(), Instant.now());
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class,
        MissingServletRequestParameterException.class, ConstraintViolationException.class,
        HandlerMethodValidationException.class})
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ApiError handleMalformedRequest(Exception exception) {
        return new ApiError("INVALID_REQUEST", "Invalid request", Instant.now());
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ApiError handleDataConflict(DataIntegrityViolationException exception) {
        return new ApiError("DATA_CONFLICT", "Request conflicts with existing data", Instant.now());
    }

    @ExceptionHandler(AuthenticationException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public ApiError handleAuthentication(AuthenticationException exception) {
        return new ApiError("UNAUTHORIZED", "Authentication required", Instant.now());
    }

    @ExceptionHandler(AccessDeniedException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public ApiError handleAccessDenied(AccessDeniedException exception) {
        return new ApiError("FORBIDDEN", "Access denied", Instant.now());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleUnexpected(Exception exception) {
        if (exception instanceof ErrorResponse error) {
            var status = error.getStatusCode();
            return ResponseEntity.status(status).body(
                new ApiError("REQUEST_FAILED", "Request could not be processed", Instant.now()));
        }
        return ResponseEntity.internalServerError().body(
            new ApiError("INTERNAL_ERROR", "An unexpected error occurred", Instant.now()));
    }
}
