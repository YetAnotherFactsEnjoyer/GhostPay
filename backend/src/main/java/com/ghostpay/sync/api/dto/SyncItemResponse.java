package com.ghostpay.sync.api.dto;

import java.util.UUID;

import com.ghostpay.sync.domain.SyncResultStatus;

public record SyncItemResponse(
  UUID localPaymentId,
  SyncResultStatus status
) {}
