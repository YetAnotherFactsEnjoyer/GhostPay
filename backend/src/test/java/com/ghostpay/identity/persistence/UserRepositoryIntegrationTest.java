package com.ghostpay.identity.persistence;

import com.ghostpay.identity.domain.User;
import org.junit.jupiter.api.Test;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class UserRepositoryIntegrationTest extends com.ghostpay.support.PostgresIntegrationTest {
    @Test
    void persistsAndFindsUserWithUuid() {
        User user = users.saveAndFlush(new User("migration-test@example.com", "test-password-hash"));

        assertNotNull(user.getId());
        assertInstanceOf(UUID.class, user.getId());
        assertTrue(users.existsByEmail(user.getEmail()));
        assertEquals(user.getId(), users.findByEmail(user.getEmail()).orElseThrow().getId());
        assertEquals(user.getEmail(), users.findById(user.getId()).orElseThrow().getEmail());
    }
}
