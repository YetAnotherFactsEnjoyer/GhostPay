package com.ghostpay.terminal.api.dto;

import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateTerminalRequest(
  @NotNull UUID merchantId,

  @NotBlank
  @Size(min = 3, max = 150)
  String name 
) {}
