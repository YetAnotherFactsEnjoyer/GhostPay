package com.ghostpay.terminal.persistence;

import java.util.UUID;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import com.ghostpay.terminal.domain.Terminal;
import com.ghostpay.merchant.domain.Merchant;

public interface TerminalRepository extends JpaRepository<Terminal, UUID> {
  List<Terminal> findByMerchant_Id(UUID merchant);

  Optional<Terminal> findByMerchant_Id(UUID terminal, UUID merchantId);

}
