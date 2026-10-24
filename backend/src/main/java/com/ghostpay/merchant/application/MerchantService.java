package com.ghostpay.merchant.application;

import java.util.UUID;

import org.springframework.stereotype.Service;

import com.ghostpay.identity.domain.User;
import com.ghostpay.identity.domain.exception.UserNotFoundException;
import com.ghostpay.identity.persistence.UserRepository;
import com.ghostpay.merchant.domain.Merchant;
import com.ghostpay.merchant.persistence.MerchantRepository;
import java.util.List;

@Service
public class MerchantService {

  private final MerchantRepository merchantRepository;
  private final UserRepository userRepository;

  public MerchantService(MerchantRepository merchantRepository, UserRepository userRepository) {
    this.merchantRepository = merchantRepository;
    this.userRepository = userRepository;
  }

  public Merchant createMerchant(String name, UUID ownerId) {
    User user = userRepository
      .findById(ownerId)
      .orElseThrow(UserNotFoundException::new);

    Merchant merchant = new Merchant( name, user);

    return merchantRepository.save(merchant);
  }

  public List<Merchant> getMerchants(UUID ownerId) {
    return merchantRepository.findByOwnerId(ownerId);
  }

}
