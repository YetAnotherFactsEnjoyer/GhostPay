package com.ghostpay.merchant.api.dto;

import java.time.Instant;
import java.util.UUID;

import com.ghostpay.merchant.domain.Merchant;

public record MerchantResponse(UUID id, String name, Instant createdAt) {
  public static MerchantResponse from(Merchant merchant) {
    return new MerchantResponse(
      merchant.getId(),
      merchant.getName(),
      merchant.getCreatedAt()
    );
  }
}
