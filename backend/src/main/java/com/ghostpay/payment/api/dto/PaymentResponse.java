package com.ghostpay.payment.api.dto;

import java.time.Instant;
import java.util.UUID;

import com.ghostpay.payment.domain.Payment;
import com.ghostpay.payment.domain.PaymentStatus;

public record PaymentResponse(
    UUID id,
    UUID terminalId,
    UUID localPaymentId,
    String purchaseReference,
    long amountMinor,
    String currency,
    PaymentStatus status,
    Instant createdAt
) {
    public static PaymentResponse from(Payment payment) {
        return new PaymentResponse(
            payment.getId(),
            payment.getTerminal().getId(),
            payment.getLocalPaymentId(),
            payment.getPurchaseReference(),
            payment.getAmountMinor(),
            payment.getCurrency(),
            payment.getStatus(),
            payment.getCreatedAt()
        );
    }
}
