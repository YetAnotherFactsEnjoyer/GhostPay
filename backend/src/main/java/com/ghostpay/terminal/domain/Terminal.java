package com.ghostpay.terminal.domain;

import java.time.Instant;
import java.util.UUID;

import com.ghostpay.merchant.domain.Merchant;

import jakarta.persistence.*;

@Entity
@Table(name = "terminals")
public class Terminal {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(nullable = false, length = 150)
  private String name;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "merchant_id", nullable = false)
  private Merchant merchant;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private TerminalStatus status;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  protected Terminal() {
  }

  public Terminal(String name, Merchant merchant) {
      this.name = name;
      this.merchant = merchant;
      this.status = TerminalStatus.ACTIVE;
  }

  @PrePersist
  protected void onCreate() {
      this.createdAt = Instant.now();
  }

  public UUID getId() {
      return id;
  }

  public String getName() {
      return name;
  }

  public Merchant getMerchant() {
      return merchant;
  }

  public TerminalStatus getStatus() {
      return status;
  }

  public Instant getCreatedAt() {
      return createdAt;
  }

  public void setName(String name) {
      this.name = name;
  }

  public void setStatus(TerminalStatus status) {
      this.status = status;
  }
}
