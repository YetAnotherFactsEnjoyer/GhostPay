package com.ghostpay.shared.exception;

import com.ghostpay.identity.domain.exception.EmailAlreadyUsedException;
import com.ghostpay.identity.domain.exception.InvalidCredentialsException;
import com.ghostpay.identity.domain.exception.UserNotFoundException;
import java.time.Instant;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

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
            message = exception.getBindingResult()
                .getFieldErrors()
                .get(0)
                .getDefaultMessage();
        }

        return new ApiError(
            "VALIDATION_FAILED",
            message,
            Instant.now()
        );
    }
}
