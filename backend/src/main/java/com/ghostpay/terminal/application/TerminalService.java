package com.ghostpay.terminal.application;

import java.util.List;
import java.util.UUID;

import org.hibernate.type.format.OsonDocumentWriter;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ghostpay.merchant.domain.Merchant;
import com.ghostpay.merchant.persistence.MerchantRepository;
import com.ghostpay.terminal.domain.Terminal;
import com.ghostpay.terminal.persistence.TerminalRepository;

@Service
public class TerminalService {
  private final TerminalRepository terminalRepository;
  private final MerchantRepository merchantRepository;

  public TerminalService(
    TerminalRepository terminalRepository, 
    MerchantRepository merchantRepository
    ) {
      this.terminalRepository = terminalRepository;
      this.merchantRepository = merchantRepository;
  }

  @Transactional
  public TerminalService createTerminal(
    String name,
    UUID merchantId,
    UUID ownerId
  ) {
    Merchant merchant = merchantRepository
      .findByIdAndOwner_Id(merchantId, ownerId)
      .orElseThrow(() -> new IllegalArgumentException("Merchant not fond"));

    Terminal terminal = new Terminal(name, merchant);

    return terminalRepository.save(terminal);
  }

  @Transactional(readOnly = true)
  public List<Terminal> getTerminals(
    UUID merchantId,
    UUID ownerId
  ) {
    merchantRepository
      .findByIdAndOwner_Id(merchantId, ownerId)
      .orElseThrow(() -> new IllegalArgumentException("Merchant not found"));

    return terminalRepository.findByMerchant_Id(merchantId);
  }

}
