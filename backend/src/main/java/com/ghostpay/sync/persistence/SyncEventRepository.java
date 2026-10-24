package com.ghostpay.sync.persistence;

import java.util.*;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ghostpay.sync.domain.SyncEvent;

public interface SyncEventRepository extends JpaRepository<SyncEvent,UUID> {
  List<SyncEvent> findByBatch_IdOrderByPositionAsc(UUID batchId);
}
