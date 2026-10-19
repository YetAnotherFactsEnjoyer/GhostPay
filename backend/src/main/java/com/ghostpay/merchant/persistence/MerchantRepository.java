package com.ghostpay.merchant.persistence;

import com.ghostpay.merchant.domain.Merchant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;
import java.util.Optional;

public interface MerchantRepository extends JpaRepository<Merchant, UUID> {

    List<Merchant> findByOwnerId(UUID ownerId);
    Optional<Merchant> findByIdAndOwner_Id(UUID merchantId, UUID ownerId);
}
