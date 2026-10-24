package com.ghostpay.terminal.domain.exception;

public class TerminalDisabledException extends RuntimeException {
    public TerminalDisabledException(String message) { super(message); }
}
