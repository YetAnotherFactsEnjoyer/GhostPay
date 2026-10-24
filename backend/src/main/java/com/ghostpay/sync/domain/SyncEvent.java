package com.ghostpay.sync.domain;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "sync_events")
public class SyncEvent {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "sync_batch_id", nullable = false)
  private SyncBatch batch;

  @Column(name = "position", nullable = false)
  private int position;

  @Column(name = "local_payment_id", nullable = false)
  private UUID localPaymentId;

  @Enumerated(EnumType.STRING)
  @Column(name = "result_status", nullable = false, length = 20)
  private SyncResultStatus resultStatus;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt;

  protected SyncEvent() {
  }

  public SyncEvent(
    SyncBatch batch,
    int position,
    UUID localPaymentId,
    SyncResultStatus resultStatus
  ) {
    this.batch = batch;
    this.position = position;
    this.localPaymentId = localPaymentId;
    this.resultStatus = resultStatus;
  }

  @PrePersist
  protected void onCreate() {
    this.createdAt = Instant.now();
  }

  public UUID getId() {
    return id;
  }

  public SyncBatch getBatch() {
    return batch;
  }

  public int getPosition() {
    return position;
  }

  public UUID getLocalPaymentId() {
    return localPaymentId;
  }

  public SyncResultStatus getResultStatus() {
    return resultStatus;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public void setBatch(SyncBatch batch) {
    this.batch = batch;
  }

  public void setPosition(int position) {
    this.position = position;
  }

  public void setLocalPaymentId(UUID localPaymentId) {
    this.localPaymentId = localPaymentId;
  }

  public void setResultStatus(SyncResultStatus resultStatus) {
    this.resultStatus = resultStatus;
  }
}
