package com.ghostpay.sync.domain;

import java.time.Instant;
import java.util.UUID;

import com.ghostpay.terminal.domain.Terminal;

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

@Entity
@Table(name = "sync_batches")
public class SyncBatch {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(name = "batch_id", nullable = false, updatable = false)
  private UUID batchId;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "terminal_id", nullable = false)
  private Terminal terminal;

  @Column(name = "request_hash", nullable = false, length = 64)
  private String requestHash;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  protected SyncBatch() {
  }

  public SyncBatch(UUID batchId, Terminal terminal, String requestHash) {
    this.batchId = batchId;
    this.terminal = terminal;
    this.requestHash = requestHash;
  }

  @PrePersist
  protected void onCreate() {
    this.createdAt = Instant.now();
  }

  public UUID getId() {
    return id;
  }

  public UUID getBatchId() {
    return batchId;
  }

  public Terminal getTerminal() {
    return terminal;
  }

  public String getRequestHash() {
    return requestHash;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setBatchId(UUID batchId) {
    this.batchId = batchId;
  }

  public void setTerminal(Terminal terminal) {
    this.terminal = terminal;
  }

  public void setRequestHash(String requestHash) {
    this.requestHash = requestHash;
  }
}
