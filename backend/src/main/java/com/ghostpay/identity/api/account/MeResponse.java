package com.ghostpay.identity.api.account;

import com.ghostpay.identity.domain.User;

import java.time.Instant;
import java.util.UUID;

public record MeResponse(UUID id, String email, Instant createdAt) {
    public static MeResponse from(User user) {
        return new MeResponse( user.getId(), user.getEmail(), user.getCreatedAt());
    }
}
