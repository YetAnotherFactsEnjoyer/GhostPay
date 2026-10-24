package com.ghostpay.sync.api;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

import com.ghostpay.sync.application.SyncService;
import com.ghostpay.sync.api.dto.SyncRequest;
import com.ghostpay.sync.api.dto.SyncResponse;

@RestController
@RequestMapping("/api/v1/terminals")
@Validated
public class SyncController {

  private final SyncService syncService;

  public SyncController(SyncService syncService) {
      this.syncService = syncService;
    }

  @PostMapping("/{terminalId}/sync")
  public ResponseEntity<SyncResponse> synchronize(
    @PathVariable UUID terminalId,
    @AuthenticationPrincipal Jwt jwt,
    @Valid @RequestBody SyncRequest request
  ) {
    UUID ownerId = UUID.fromString(jwt.getSubject());

    SyncResponse response = syncService.synchronize(
      terminalId,
      ownerId,
      request
    );

    return ResponseEntity.ok(response);
  }
}
