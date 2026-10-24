package com.ghostpay.support;

import com.ghostpay.identity.domain.User;
import com.ghostpay.identity.persistence.UserRepository;
import com.ghostpay.merchant.domain.Merchant;
import com.ghostpay.merchant.persistence.MerchantRepository;
import com.ghostpay.payment.persistence.PaymentRepository;
import com.ghostpay.shared.security.JwtService;
import com.ghostpay.sync.api.dto.OfflinePaymentRequest;
import com.ghostpay.sync.api.dto.SyncRequest;
import com.ghostpay.sync.persistence.SyncBatchRepository;
import com.ghostpay.sync.persistence.SyncEventRepository;
import com.ghostpay.terminal.domain.Terminal;
import com.ghostpay.terminal.persistence.TerminalRepository;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.ObjectMapper;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

@SpringBootTest(properties = {
    "spring.config.import=",
    "security.jwt.secret=integration-test-key-only-32-bytes-minimum",
    "security.jwt.issuer=ghostpay",
    "security.jwt.expiration=1h",
    "security.cors.allowed-origins=https://frontend.example"
})
@AutoConfigureMockMvc
public abstract class PostgresIntegrationTest {
    // A fresh disposable database is mandatory. Never fall back to a developer datasource.
    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:17-alpine");
    static {
        POSTGRES.start();
    }

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        properties.add("spring.datasource.username", POSTGRES::getUsername);
        properties.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired protected MockMvc mvc;
    @Autowired protected ObjectMapper json;
    @Autowired protected UserRepository users;
    @Autowired protected MerchantRepository merchants;
    @Autowired protected TerminalRepository terminals;
    @Autowired protected PaymentRepository payments;
    @Autowired protected SyncBatchRepository batches;
    @Autowired protected SyncEventRepository events;
    @Autowired protected JdbcTemplate jdbc;
    @Autowired protected JwtService jwtService;
    @Autowired protected PasswordEncoder passwords;
    protected User owner;
    protected Terminal terminal;
    protected String token;

    @BeforeEach
    void createFixture() {
        events.deleteAllInBatch();
        batches.deleteAllInBatch();
        payments.deleteAllInBatch();
        terminals.deleteAllInBatch();
        merchants.deleteAllInBatch();
        users.deleteAllInBatch();
        owner = users.saveAndFlush(new User("owner@example.com", passwords.encode("password123")));
        Merchant merchant = merchants.saveAndFlush(new Merchant("Test merchant", owner));
        terminal = terminals.saveAndFlush(new Terminal("Test terminal", merchant));
        token = jwtService.generateAccessToken(owner);
    }

    protected OfflinePaymentRequest payment() {
        return new OfflinePaymentRequest(UUID.randomUUID(), "purchase-1", 1200, "MYR");
    }

    protected SyncRequest batch(OfflinePaymentRequest... items) {
        return new SyncRequest(UUID.randomUUID(), List.of(items));
    }

    protected String syncPath() {
        return "/api/v1/terminals/" + terminal.getId() + "/sync";
    }

    protected ResultActions synchronize(SyncRequest request) throws Exception {
        return mvc.perform(post(syncPath()).header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(request)));
    }

    protected String otherToken() {
        User other = users.saveAndFlush(new User("other@example.com", owner.getPasswordHash()));
        return jwtService.generateAccessToken(other);
    }
}
