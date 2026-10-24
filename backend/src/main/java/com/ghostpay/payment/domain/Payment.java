package com.ghostpay.payment.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import jakarta.persistence.*;
import jakarta.validation.constraints.Pattern;

import com.ghostpay.terminal.domain.Terminal;
import jakarta.validation.constraints.NotNull;

@Entity
@Table(name = "payments")
public class Payment {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  private Terminal terminal;

  @NotNull
  private UUID localPaymentId;

  @Size(max = 100)
  private String purchaseReference;

  @NotNull
  @Positive
  private Long amountMinor;

  @Pattern(regexp="[A-Z]{3}")
  private String currency;

  @Enumerated(EnumType.STRING)
  private PaymentStatus status;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  protected Payment() {}

  public Payment(Terminal terminal, UUID localPaymentId, String purchaseReference,
                 long amountMinor, String currency, PaymentStatus status) {
    this.terminal = terminal;
    this.localPaymentId = localPaymentId;
    this.purchaseReference = purchaseReference;
    this.amountMinor = amountMinor;
    this.currency = currency;
    this.status = status;
  }

  @PrePersist
  protected void onCreate() {
    this.createdAt = Instant.now();
  }

  public UUID getId() {
    return id;
  }

  public Terminal getTerminal() {
    return terminal;
  }

  public UUID getLocalPaymentId() {
    return localPaymentId;
  }

  public String getPurchaseReference() {
    return purchaseReference;
  }

  public Long getAmountMinor() {
    return amountMinor;
  }

  public String getCurrency() {
    return currency;
  }

  public PaymentStatus getStatus() {
    return status;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }
}
