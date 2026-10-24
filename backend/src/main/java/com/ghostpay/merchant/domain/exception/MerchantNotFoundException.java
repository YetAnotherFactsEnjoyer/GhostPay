package com.ghostpay.merchant.domain.exception;

public class MerchantNotFoundException extends RuntimeException {
    public MerchantNotFoundException() {
        super("Merchant not found");
    }
}
