package com.ghostpay.payment.application;

import com.ghostpay.payment.domain.Payment;
import com.ghostpay.payment.persistence.PaymentRepository;
import com.ghostpay.terminal.domain.exception.TerminalNotFoundException;
import com.ghostpay.terminal.persistence.TerminalRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PaymentService {

  private final TerminalRepository terminalRepository;
  private final PaymentRepository paymentRepository;

  public PaymentService(
    TerminalRepository terminalRepository,
    PaymentRepository paymentRepository
  ) {
    this.terminalRepository = terminalRepository;
    this.paymentRepository = paymentRepository;
  }

  @Transactional(readOnly = true)
  public List<Payment> getPayments(UUID terminalId, UUID ownerId) {
    terminalRepository.findByIdAndMerchant_Owner_Id(terminalId, ownerId)
      .orElseThrow(() -> new TerminalNotFoundException("Terminal not found"));

    return paymentRepository.findByTerminal_Id(terminalId);
  }
}
