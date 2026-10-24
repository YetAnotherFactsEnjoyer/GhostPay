package com.ghostpay.sync.persistence;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ghostpay.sync.domain.SyncBatch;

public interface SyncBatchRepository extends JpaRepository<SyncBatch, UUID> {
  Optional<SyncBatch> findByTerminal_IdAndBatchId(UUID terminalId, UUID batchId);
}
