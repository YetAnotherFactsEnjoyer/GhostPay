package com.ghostpay.payment.api.dto;

import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record PaymentRequest(
    @NotNull
    UUID localPaymentId,

    @NotBlank
    @Size(max = 100)
    String purchaseReference,

    @Positive
    long amountMinor,

    @NotBlank
    @Pattern(regexp = "MYR")
    String currency
) {}
