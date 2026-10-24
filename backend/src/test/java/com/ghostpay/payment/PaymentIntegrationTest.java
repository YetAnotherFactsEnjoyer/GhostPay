package com.ghostpay.payment;

import com.ghostpay.support.PostgresIntegrationTest;
import com.ghostpay.sync.api.dto.OfflinePaymentRequest;
import com.ghostpay.terminal.domain.Terminal;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class PaymentIntegrationTest extends PostgresIntegrationTest {
    @Autowired PlatformTransactionManager transactions;

    @Test
    void validSyncedPaymentCanBeListedByOwner() throws Exception {
        var item = payment();
        synchronize(batch(item)).andExpect(status().isOk());
        mvc.perform(get("/api/v1/payments").param("terminalId", terminal.getId().toString())
            .header("Authorization", "Bearer " + token)).andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].localPaymentId").value(item.localPaymentId().toString()))
            .andExpect(jsonPath("$[0].amountMinor").value(item.amountMinor()))
            .andExpect(jsonPath("$[0].currency").value("MYR"))
            .andExpect(jsonPath("$[0].status").value("ACCEPTED"));
        assertEquals(1, payments.count());
    }

    @Test
    void invalidAmountsCurrenciesAndReferencesAreRejectedWithoutPersistence() throws Exception {
        var item = payment();
        for (var invalid : List.of(
            new OfflinePaymentRequest(item.localPaymentId(), "ref", 0, "MYR"),
            new OfflinePaymentRequest(item.localPaymentId(), "ref", -1, "MYR"),
            new OfflinePaymentRequest(item.localPaymentId(), "ref", 100, "USD"),
            new OfflinePaymentRequest(item.localPaymentId(), "ref", 100, "myr"),
            new OfflinePaymentRequest(item.localPaymentId(), "ref", 100, null),
            new OfflinePaymentRequest(item.localPaymentId(), " ", 100, "MYR"),
            new OfflinePaymentRequest(item.localPaymentId(), "x".repeat(101), 100, "MYR"))) {
            synchronize(batch(invalid)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"));
        }
        assertEquals(0, payments.count());
        assertEquals(0, batches.count());
        assertEquals(0, events.count());
    }

    @Test
    void anotherOwnerCannotReadPaymentsOrTerminalsOrCreateTerminalForMerchant() throws Exception {
        synchronize(batch(payment())).andExpect(status().isOk());
        String other = otherToken();
        mvc.perform(get("/api/v1/payments").param("terminalId", terminal.getId().toString())
            .header("Authorization", "Bearer " + other)).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/terminals").param("merchantId", terminal.getMerchant().getId().toString())
            .header("Authorization", "Bearer " + other)).andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/terminals").header("Authorization", "Bearer " + other).contentType("application/json")
            .content("{\"name\":\"Intruder\",\"merchantId\":\"" + terminal.getMerchant().getId() + "\"}"))
            .andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/merchants").header("Authorization", "Bearer " + other))
            .andExpect(status().isOk()).andExpect(content().json("[]"));
        assertEquals(1, payments.count());
        assertEquals(1, terminals.count());
    }

    @Test
    void unauthenticatedPaymentReadReturns401() throws Exception {
        mvc.perform(get("/api/v1/payments").param("terminalId", terminal.getId().toString()))
            .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void malformedOrMissingTerminalParameterReturns400() throws Exception {
        mvc.perform(get("/api/v1/payments").param("terminalId", "invalid").header("Authorization", "Bearer " + token))
            .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/payments").header("Authorization", "Bearer " + token))
            .andExpect(status().isBadRequest());
    }

    @Test
    void databaseEnforcesPaymentBatchAndEventUniqueness() throws Exception {
        synchronize(batch(payment())).andExpect(status().isOk());
        for (String sql : List.of(
            "INSERT INTO payments SELECT gen_random_uuid(), terminal_id, local_payment_id, purchase_reference, amount_minor, currency, status, created_at FROM payments",
            "INSERT INTO sync_batches SELECT gen_random_uuid(), batch_id, terminal_id, request_hash, created_at FROM sync_batches",
            "INSERT INTO sync_events SELECT gen_random_uuid(), sync_batch_id, position, local_payment_id, result_status, created_at FROM sync_events")) {
            assertThrows(DataIntegrityViolationException.class,
                () -> new TransactionTemplate(transactions).executeWithoutResult(tx -> jdbc.update(sql)));
        }
        assertEquals(1, payments.count());
        assertEquals(1, batches.count());
        assertEquals(1, events.count());
    }

    @Test
    void localPaymentIdIsScopedToTerminal() throws Exception {
        var item = payment();
        synchronize(batch(item)).andExpect(status().isOk());
        terminal = terminals.saveAndFlush(new Terminal("Second terminal", terminal.getMerchant()));
        synchronize(batch(item)).andExpect(status().isOk()).andExpect(jsonPath("$.results[0].status").value("ACCEPTED"));
        assertEquals(2, payments.count());
    }
}
