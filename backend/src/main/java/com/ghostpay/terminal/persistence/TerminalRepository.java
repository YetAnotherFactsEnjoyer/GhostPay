package com.ghostpay.terminal.persistence;

import java.util.UUID;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.ghostpay.terminal.domain.Terminal;

import jakarta.persistence.LockModeType;

public interface TerminalRepository extends JpaRepository<Terminal, UUID> {
  List<Terminal> findByMerchant_Id(UUID merchant);

  Optional<Terminal> findByIdAndMerchant_Owner_Id(
    UUID terminalId,
    UUID ownerId
  );

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT t FROM Terminal t WHERE t.id = :id")
  Optional<Terminal> findByIdForUpdate(@Param("id") UUID id);
}
