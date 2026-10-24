package com.ghostpay.terminal.domain.exception;

public class TerminalNotFoundException extends RuntimeException {
    public TerminalNotFoundException(String message) { super(message); }
}
