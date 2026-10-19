package com.ghostpay.terminal.api.dto;

import java.time.Instant;
import java.util.UUID;

import com.ghostpay.terminal.domain.Terminal;
import com.ghostpay.terminal.domain.TerminalStatus;

public record TerminalResponse(
  UUID id,
  String name,
  UUID merchantId,
  TerminalStatus status,
  Instant createdAt
) {
  public static TerminalResponse from(Terminal terminal){
    return new TerminalResponse(
      terminal.getId(),
      terminal.getName(),
      terminal.getMerchant().getId(),
      terminal.getStatus(),
      terminal.getCreatedAt()
    );
  }
}
