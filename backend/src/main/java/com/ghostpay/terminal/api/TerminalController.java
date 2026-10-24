package com.ghostpay.terminal.api;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

import com.ghostpay.terminal.api.dto.CreateTerminalRequest;
import com.ghostpay.terminal.api.dto.TerminalResponse;
import com.ghostpay.terminal.application.TerminalService;

@RestController
@RequestMapping("/api/v1/terminals")
public class TerminalController {

  private final TerminalService terminalService;

  public TerminalController (TerminalService terminalService) {
    this.terminalService = terminalService;
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public TerminalResponse createTerminal(
    @Valid @RequestBody CreateTerminalRequest request,
    @AuthenticationPrincipal Jwt jwt
  ) {
    UUID ownerId = UUID.fromString(jwt.getSubject());

    return TerminalResponse.from(
      terminalService.createTerminal(
        request.name(),
        request.merchantId(),
        ownerId
      )
    );
  }

  @GetMapping
  public List<TerminalResponse> getTerminals(
    @RequestParam UUID merchantId,
    @AuthenticationPrincipal Jwt jwt
  ) {
    UUID ownerId = UUID.fromString(jwt.getSubject());

    return terminalService
      .getTerminals(merchantId, ownerId)
      .stream()
      .map(TerminalResponse::from)
      .toList();
  }
}
