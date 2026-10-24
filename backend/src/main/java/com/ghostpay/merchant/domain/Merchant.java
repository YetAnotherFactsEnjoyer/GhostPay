
package com.ghostpay.merchant.domain;

import com.ghostpay.identity.domain.User;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "merchants")
public class Merchant {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(nullable = false, length = 150)
  private String name;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "owner_id", nullable = false)
  private User owner;

  @Column(name = "created_at", nullable = false)
  private Instant createdAt;

  protected Merchant() {
  }

  public Merchant(String name, User owner) {
      this.name = name;
      this.owner = owner;
  }

  @PrePersist
  protected void onCreate() {
      createdAt = Instant.now();
  }

  public UUID getId() {
      return id;
  }

  public String getName() {
      return name;
  }

  public void setName(String name) {
      this.name = name;
  }

  public User getOwner() {
      return owner;
  }

  public void setOwner(User owner) {
      this.owner = owner;
  }

  public Instant getCreatedAt() {
      return createdAt;
  }
}

