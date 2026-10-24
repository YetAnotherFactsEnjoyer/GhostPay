package com.ghostpay.sync.api.dto;

import java.util.List;
import java.util.UUID;

public record SyncResponse(
  UUID batchId,
  List<SyncItemResponse> results
) {}
