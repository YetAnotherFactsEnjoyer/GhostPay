package com.ghostpay.payment.persistence;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ghostpay.payment.domain.Payment;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {
  Optional<Payment> findByTerminal_IdAndLocalPaymentId(
    UUID terminalId,
    UUID localPaymentId
  );
  List<Payment> findByTerminal_Id(UUID terminalId);
}
