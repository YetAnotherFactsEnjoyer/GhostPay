package com.ghostpay.identity.api.register;

import com.ghostpay.identity.domain.User;

import java.time.Instant;
import java.util.UUID;

public record RegisterResponse(
        UUID id,
        String email,
        Instant createdAt) {

    public static RegisterResponse from(User user) {
        return new RegisterResponse(user.getId(),user.getEmail(),user.getCreatedAt());
    }
}
