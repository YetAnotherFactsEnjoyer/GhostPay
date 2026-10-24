package com.ghostpay.sync.domain.exception;

public class BatchConflictException extends RuntimeException {
    public BatchConflictException(String message) { super(message); }
}
