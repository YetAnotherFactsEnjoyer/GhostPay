package com.ghostpay.shared.security.jwt;

import static org.junit.jupiter.api.Assertions.*;
import java.time.Duration;
import org.junit.jupiter.api.Test;

class JwtConfigTest {
    private final JwtConfig config = new JwtConfig();

    @Test
    void missingSecretFailsFast() {
        assertThrows(IllegalStateException.class,
            () -> config.jwtSecretKey(new JwtProperties(null, "convertly", Duration.ofHours(1))));
    }

    @Test
    void shortSecretFailsFast() {
        assertThrows(IllegalStateException.class,
            () -> config.jwtSecretKey(new JwtProperties("too-short", "convertly", Duration.ofHours(1))));
    }

    @Test
    void sufficientSecretCreatesHs256Key() {
        var key = config.jwtSecretKey(new JwtProperties("12345678901234567890123456789012", "convertly", Duration.ofHours(1)));
        assertEquals(32, key.getEncoded().length);
        assertEquals("HmacSHA256", key.getAlgorithm());
    }
}
