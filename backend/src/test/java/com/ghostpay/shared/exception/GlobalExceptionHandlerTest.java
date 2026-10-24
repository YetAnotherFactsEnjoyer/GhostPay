package com.ghostpay.shared.exception;

import static org.junit.jupiter.api.Assertions.*;
import java.lang.reflect.Method;
import org.junit.jupiter.api.Test;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.core.MethodParameter;

class GlobalExceptionHandlerTest {
    void endpoint(String email) {}

    @Test
    void validationErrorIncludesFieldName() throws Exception {
        Method method = getClass().getDeclaredMethod("endpoint", String.class);
        var parameter = new MethodParameter(method, 0);
        var result = new BeanPropertyBindingResult(new Object(), "request");
        result.addError(new FieldError("request", "email", "must be a well-formed email address"));
        var error = new GlobalExceptionHandler().handleInvalidRequest(
            new MethodArgumentNotValidException(parameter, result));
        assertEquals("VALIDATION_FAILED", error.code());
        assertTrue(error.message().contains("email"));
    }
    @Test
    void unexpectedErrorsNeverExposeInternalDetails() {
        var response = new GlobalExceptionHandler().handleUnexpected(
            new IllegalStateException("database password=secret"));
        assertEquals(500, response.getStatusCode().value());
        assertEquals("INTERNAL_ERROR", response.getBody().code());
        assertEquals("An unexpected error occurred", response.getBody().message());
    }

    @Test
    void databaseConflictsNeverExposeSqlDetails() {
        var error = new GlobalExceptionHandler().handleDataConflict(
            new org.springframework.dao.DataIntegrityViolationException("INSERT INTO users password_hash=secret"));
        assertEquals("DATA_CONFLICT", error.code());
        assertEquals("Request conflicts with existing data", error.message());
    }

    @Test
    void accessDeniedHasSafeErrorMessageAnd403Mapping() throws Exception {
        var handler = new GlobalExceptionHandler();
        var error = handler.handleAccessDenied(new org.springframework.security.access.AccessDeniedException("internal policy"));
        assertEquals("FORBIDDEN", error.code());
        assertEquals("Access denied", error.message());
        var method = GlobalExceptionHandler.class.getMethod("handleAccessDenied", org.springframework.security.access.AccessDeniedException.class);
        assertEquals(org.springframework.http.HttpStatus.FORBIDDEN,
            method.getAnnotation(org.springframework.web.bind.annotation.ResponseStatus.class).value());
    }

    @Test
    void frameworkHttpStatusesArePreserved() {
        var response = new GlobalExceptionHandler().handleUnexpected(
            new org.springframework.web.HttpRequestMethodNotSupportedException("DELETE"));
        assertEquals(405, response.getStatusCode().value());
        assertEquals("REQUEST_FAILED", response.getBody().code());
    }
}
