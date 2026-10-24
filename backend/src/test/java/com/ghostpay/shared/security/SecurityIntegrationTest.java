package com.ghostpay.shared.security;

import com.ghostpay.support.PostgresIntegrationTest;
import java.time.Instant;
import java.util.List;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class SecurityIntegrationTest extends PostgresIntegrationTest {
    @Autowired JwtEncoder encoder;

    @Test
    void registrationAndLoginArePublicAndNeverReturnPasswordHashes() throws Exception {
        String credentials = "{\"email\":\"new@example.com\",\"password\":\"password123\"}";
        String registration = mvc.perform(post("/api/v1/auth/register").contentType("application/json").content(credentials))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.email").value("new@example.com"))
            .andExpect(jsonPath("$.passwordHash").doesNotExist()).andReturn().getResponse().getContentAsString();
        var user = users.findByEmail("new@example.com").orElseThrow();
        assertNotEquals("password123", user.getPasswordHash());
        assertTrue(passwords.matches("password123", user.getPasswordHash()));
        assertFalse(registration.contains(user.getPasswordHash()));
        mvc.perform(post("/api/v1/auth/register").contentType("application/json").content(credentials))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("EMAIL_ALREADY_USED"));
        String login = mvc.perform(post("/api/v1/auth/login").contentType("application/json").content(credentials))
            .andExpect(status().isOk()).andExpect(jsonPath("$.tokenType").value("Bearer"))
            .andReturn().getResponse().getContentAsString();
        mvc.perform(get("/api/v1/account/me").header("Authorization", "Bearer " + json.readTree(login).get("accessToken").asText()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.email").value("new@example.com"))
            .andExpect(jsonPath("$.passwordHash").doesNotExist());
        mvc.perform(post("/api/v1/auth/login").contentType("application/json")
            .content(credentials.replace("password123", "wrong-password")))
            .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("INVALID_CREDENTIALS"));
    }

    @Test
    void invalidSignatureExpiredWrongIssuerMissingExpirationAndMalformedSubjectAreRejected() throws Exception {
        Instant now = Instant.now();
        var wrongEncoder = NimbusJwtEncoder.withSecretKey(new SecretKeySpec(
            "a-different-signing-key-at-least-32-bytes".getBytes(java.nio.charset.StandardCharsets.UTF_8), "HmacSHA256"))
            .algorithm(MacAlgorithm.HS256).build();
        for (String invalid : List.of(
            signed(encoder, "ghostpay", owner.getId().toString(), now.minusSeconds(120)),
            signed(encoder, "wrong-issuer", owner.getId().toString(), now.plusSeconds(3600)),
            signed(encoder, "ghostpay", "bad-subject", now.plusSeconds(3600)),
            signed(encoder, "ghostpay", null, now.plusSeconds(3600)),
            signed(encoder, "ghostpay", owner.getId().toString(), null),
            signed(wrongEncoder, "ghostpay", owner.getId().toString(), now.plusSeconds(3600)))) {
            mvc.perform(get("/api/v1/account/me").header("Authorization", "Bearer " + invalid))
                .andExpect(status().isUnauthorized()).andExpect(header().string("WWW-Authenticate", "Bearer"))
                .andExpect(jsonPath("$.message").value("Authentication required"));
        }
    }

    @Test
    void protectedRoutesAndActuatorRequireAuthenticationAndNoSessionIsCreated() throws Exception {
        for (String path : List.of("/api/v1/account/me", "/api/v1/merchants", "/api/v1/terminals", "/api/v1/payments", "/actuator", "/actuator/health")) {
            mvc.perform(get(path)).andExpect(status().isUnauthorized());
        }
        var response = mvc.perform(get("/api/v1/account/me").header("Authorization", "Bearer " + token))
            .andExpect(status().isOk()).andReturn();
        assertNull(response.getRequest().getSession(false));
    }

    @Test
    void crossOriginRequestsAreNotGrantedAccessByDefault() throws Exception {
        mvc.perform(options("/api/v1/payments").header("Origin", "https://untrusted.example")
            .header("Access-Control-Request-Method", "GET"))
            .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }

    @Test
    void configuredFrontendOriginIsAllowed() throws Exception {
        mvc.perform(options("/api/v1/payments").header("Origin", "https://frontend.example")
            .header("Access-Control-Request-Method", "GET")
            .header("Access-Control-Request-Headers", "authorization"))
            .andExpect(status().isOk())
            .andExpect(header().string("Access-Control-Allow-Origin", "https://frontend.example"));
    }

    @Test
    void passwordsExceedingBcryptByteLimitAreHandledWithoutServerError() throws Exception {
        for (String password : List.of("x".repeat(73), "é".repeat(37))) {
            String credentials = json.writeValueAsString(java.util.Map.of("email", "long@example.com", "password", password));
            mvc.perform(post("/api/v1/auth/register").contentType("application/json").content(credentials))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_PASSWORD"));
            mvc.perform(post("/api/v1/auth/login").contentType("application/json").content(credentials))
                .andExpect(status().isUnauthorized());
        }
        assertFalse(users.existsByEmail("long@example.com"));
    }

    private String signed(JwtEncoder signer, String issuer, String subject, Instant expires) {
        var claims = JwtClaimsSet.builder().issuer(issuer).issuedAt(Instant.now().minusSeconds(600));
        if (subject != null) claims.subject(subject);
        if (expires != null) claims.expiresAt(expires);
        return signer.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims.build())).getTokenValue();
    }
}
