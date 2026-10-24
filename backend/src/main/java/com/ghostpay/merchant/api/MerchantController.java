package com.ghostpay.merchant.api;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.oauth2.jwt.Jwt;

import com.ghostpay.merchant.api.dto.CreateMerchantRequest;
import com.ghostpay.merchant.api.dto.MerchantResponse;
import com.ghostpay.merchant.application.MerchantService;
import com.ghostpay.merchant.domain.Merchant;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/merchants")
public class MerchantController {

  private final MerchantService merchantService;

  public MerchantController(MerchantService merchantService) {
    this.merchantService = merchantService;
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public MerchantResponse createdMerchant(@Valid @RequestBody CreateMerchantRequest request, @AuthenticationPrincipal Jwt jwt) {
    UUID ownerId = UUID.fromString(jwt.getSubject());
 
    Merchant merchant = merchantService.createMerchant(request.name(), ownerId);

    return MerchantResponse.from(merchant);
  }

  @GetMapping
  public List<MerchantResponse> getMerchants(@AuthenticationPrincipal Jwt jwt) {
    UUID ownerId = UUID.fromString(jwt.getSubject());

    List<Merchant> merchants = merchantService.getMerchants(ownerId);

    return merchants.stream()
      .map(MerchantResponse::from)
      .toList();
  }
}
