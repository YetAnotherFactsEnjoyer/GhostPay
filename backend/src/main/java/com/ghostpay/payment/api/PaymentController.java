package com.ghostpay.payment.api;

import java.util.List;
import java.util.UUID;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.ghostpay.payment.application.PaymentService;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

import com.ghostpay.payment.api.dto.*;
import com.ghostpay.payment.domain.Payment;

@RestController
@RequestMapping("/api/v1/payments")
public class PaymentController {

  private final PaymentService paymentService;

  public PaymentController(PaymentService paymentService) {
    this.paymentService = paymentService;
  }

  @GetMapping
  public List<PaymentResponse> getPayments(
    @RequestParam UUID terminalId,
    @AuthenticationPrincipal Jwt jwt
  ) {
    UUID ownerId = UUID.fromString(jwt.getSubject());

    List<Payment> payments = paymentService.getPayments(terminalId, ownerId);

     return payments.stream()
      .map(PaymentResponse::from)
      .toList();
  }

}
