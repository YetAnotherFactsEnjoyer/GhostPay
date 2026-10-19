package com.ghostpay.merchant.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateMerchantRequest(
    @NotBlank(message = "Merchant name is required")
    @Size(min = 3, max = 150)
    String name
) {}
