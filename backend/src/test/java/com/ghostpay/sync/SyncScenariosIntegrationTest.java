package com.ghostpay.sync;

import com.ghostpay.support.PostgresIntegrationTest;
import com.ghostpay.sync.api.dto.OfflinePaymentRequest;
import com.ghostpay.sync.api.dto.SyncRequest;
import com.ghostpay.terminal.domain.TerminalStatus;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class SyncScenariosIntegrationTest extends PostgresIntegrationTest {
    @Test
    void newBatchAcceptsAndPersistsPaymentsAndEvents() throws Exception {
        var item = payment();
        var request = batch(item);

        synchronize(request).andExpect(status().isOk())
            .andExpect(jsonPath("$.batchId").value(request.batchId().toString()))
            .andExpect(jsonPath("$.results[0].localPaymentId").value(item.localPaymentId().toString()))
            .andExpect(jsonPath("$.results[0].status").value("ACCEPTED"));

        assertEquals(1, payments.count());
        assertEquals(1, batches.count());
        assertEquals(1, events.count());
        var saved = payments.findByTerminal_IdAndLocalPaymentId(terminal.getId(), item.localPaymentId()).orElseThrow();
        assertEquals(item.amountMinor(), saved.getAmountMinor());
        assertEquals(item.purchaseReference(), saved.getPurchaseReference());
        assertEquals("MYR", saved.getCurrency());
        assertEquals("ACCEPTED", saved.getStatus().name());
    }

    @Test
    void identicalPaymentInNewBatchIsDuplicate() throws Exception {
        var item = payment();
        synchronize(batch(item)).andExpect(status().isOk());

        synchronize(batch(item)).andExpect(status().isOk())
            .andExpect(jsonPath("$.results[0].status").value("DUPLICATE"));

        assertEquals(1, payments.count());
        assertEquals(2, batches.count());
        assertEquals(2, events.count());
    }

    @Test
    void reusedLocalIdWithDifferentDetailsConflictsWithoutChangingPayment() throws Exception {
        var item = payment();
        synchronize(batch(item)).andExpect(status().isOk());
        var changed = new OfflinePaymentRequest(item.localPaymentId(), "different", 999, "MYR");

        synchronize(batch(changed)).andExpect(status().isOk())
            .andExpect(jsonPath("$.results[0].status").value("CONFLICT"));

        assertEquals(1, payments.count());
        assertEquals(item.amountMinor(), payments.findAll().getFirst().getAmountMinor());
        assertEquals(item.purchaseReference(), payments.findAll().getFirst().getPurchaseReference());
        assertEquals(2, events.count());
    }

    @Test
    void identicalBatchRetryReturnsOriginalResultsWithoutAdditionalWrites() throws Exception {
        var request = batch(payment());
        String original = synchronize(request).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();

        synchronize(request).andExpect(status().isOk()).andExpect(content().json(original));

        assertEquals(1, payments.count());
        assertEquals(1, batches.count());
        assertEquals(1, events.count());
    }

    @Test
    void changedBatchPayloadReturns409AndPreservesOriginalData() throws Exception {
        var request = batch(payment());
        synchronize(request).andExpect(status().isOk());

        synchronize(new SyncRequest(request.batchId(), List.of(payment())))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("BATCH_CONFLICT"));

        assertEquals(1, payments.count());
        assertEquals(1, batches.count());
        assertEquals(1, events.count());
    }

    @Test
    void newBatchOnDisabledTerminalReturns409WithoutWrites() throws Exception {
        disableTerminal();

        synchronize(batch(payment())).andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("TERMINAL_DISABLED"));

        assertEmptySyncState();
    }

    @Test
    void completedBatchCanBeReplayedAfterTerminalIsDisabled() throws Exception {
        var request = batch(payment());
        String original = synchronize(request).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        disableTerminal();

        synchronize(request).andExpect(status().isOk()).andExpect(content().json(original));

        assertEquals(1, payments.count());
        assertEquals(1, batches.count());
        assertEquals(1, events.count());
    }

    @Test
    void otherOwnerCannotSynchronizeOrReplayBatch() throws Exception {
        var request = batch(payment());
        synchronize(request).andExpect(status().isOk());
        token = otherToken();

        synchronize(request).andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("TERMINAL_NOT_FOUND"));
        synchronize(batch(payment())).andExpect(status().isNotFound());

        assertEquals(1, payments.count());
        assertEquals(1, batches.count());
        assertEquals(1, events.count());
    }

    @Test
    void invalidPayloadsReturn400WithoutWrites() throws Exception {
        for (String body : List.of("{}", "{", "{\"batchId\":\"bad-uuid\",\"payments\":[]}",
            "{\"batchId\":\"" + UUID.randomUUID() + "\",\"payments\":[null]}",
            json.writeValueAsString(new SyncRequest(UUID.randomUUID(), List.of())))) {
            mvc.perform(post(syncPath()).header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").exists());
        }
        mvc.perform(post("/api/v1/terminals/not-a-uuid/sync").header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(batch(payment()))))
            .andExpect(status().isBadRequest());
        assertEmptySyncState();
    }

    @Test
    void batchOverLimitOrMissingPaymentIdReturns400WithoutWrites() throws Exception {
        synchronize(new SyncRequest(UUID.randomUUID(), java.util.Collections.nCopies(101, payment())))
            .andExpect(status().isBadRequest());
        synchronize(batch(new OfflinePaymentRequest(null, "ref", 100, "MYR")))
            .andExpect(status().isBadRequest());
        assertEmptySyncState();
    }

    @Test
    void reorderingCompletedBatchReturns409() throws Exception {
        var first = payment();
        var second = payment();
        var request = batch(first, second);
        synchronize(request).andExpect(status().isOk());
        synchronize(new SyncRequest(request.batchId(), List.of(second, first)))
            .andExpect(status().isConflict());
        assertEquals(2, payments.count());
        assertEquals(1, batches.count());
        assertEquals(2, events.count());
    }

    @Test
    void missingOrInvalidJwtReturns401WithoutWrites() throws Exception {
        String body = json.writeValueAsString(batch(payment()));
        mvc.perform(post(syncPath()).contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
        token = "invalid.jwt.token";
        synchronize(batch(payment())).andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
        assertEmptySyncState();
    }

    @Test
    void databaseFailureAfterFirstPaymentRollsBackEntireBatch() throws Exception {
        // Real PostgreSQL failure on the second insert proves payments, batch and events are atomic.
        jdbc.execute("""
            CREATE FUNCTION fail_test_payment() RETURNS trigger LANGUAGE plpgsql AS $$
            BEGIN
                IF NEW.purchase_reference = 'rollback-test' THEN
                    RAISE EXCEPTION 'test-only database failure';
                END IF;
                RETURN NEW;
            END $$
            """);
        jdbc.execute("CREATE TRIGGER fail_test_payment BEFORE INSERT ON payments FOR EACH ROW EXECUTE FUNCTION fail_test_payment()");
        try {
            var failing = new OfflinePaymentRequest(UUID.randomUUID(), "rollback-test", 100, "MYR");
            synchronize(batch(payment(), failing)).andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message").value("An unexpected error occurred"))
                .andExpect(jsonPath("$.code").value("INTERNAL_ERROR"));
            assertEmptySyncState();
        } finally {
            jdbc.execute("DROP TRIGGER fail_test_payment ON payments");
            jdbc.execute("DROP FUNCTION fail_test_payment()");
        }
    }

    @Test
    void mixedBatchAndReplayPreserveRequestOrderIncludingRepeatedLocalIds() throws Exception {
        var existing = payment();
        synchronize(batch(existing)).andExpect(status().isOk());
        var fresh = payment();
        var conflict = new OfflinePaymentRequest(existing.localPaymentId(), "changed", 200, "MYR");
        var request = batch(fresh, existing, conflict, fresh);

        String response = synchronize(request).andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        var results = json.readTree(response).get("results");
        assertEquals(4, results.size());
        var expectedIds = List.of(fresh.localPaymentId(), existing.localPaymentId(), existing.localPaymentId(), fresh.localPaymentId());
        var expectedStatuses = List.of("ACCEPTED", "DUPLICATE", "CONFLICT", "DUPLICATE");
        for (int i = 0; i < results.size(); i++) {
            assertEquals(expectedIds.get(i).toString(), results.get(i).get("localPaymentId").asText());
            assertEquals(expectedStatuses.get(i), results.get(i).get("status").asText());
        }
        synchronize(request).andExpect(status().isOk()).andExpect(content().json(response));
        var savedBatch = batches.findByTerminal_IdAndBatchId(terminal.getId(), request.batchId()).orElseThrow();
        var savedEvents = events.findByBatch_IdOrderByPositionAsc(savedBatch.getId());
        assertEquals(List.of(0, 1, 2, 3), savedEvents.stream().map(e -> e.getPosition()).toList());
        assertEquals(2, payments.count());
        assertEquals(2, batches.count());
        assertEquals(5, events.count());
    }

    @Test
    void simultaneousIdenticalBatchesPersistOnlyOnePaymentBatchAndEvent() throws Exception {
        var request = batch(payment());
        var responses = concurrently(request, request);
        assertEquals(responses.get(0), responses.get(1));
        assertEquals("ACCEPTED", json.readTree(responses.getFirst()).at("/results/0/status").asText());
        assertEquals(1, payments.count());
        assertEquals(1, batches.count());
        assertEquals(1, events.count());
    }

    @Test
    void simultaneousDifferentBatchesWithSamePaymentAcceptOnceAndDetectDuplicate() throws Exception {
        var item = payment();
        var responses = concurrently(batch(item), batch(item));
        var statuses = responses.stream().map(body -> json.readTree(body).at("/results/0/status").asText()).sorted().toList();
        assertEquals(List.of("ACCEPTED", "DUPLICATE"), statuses);
        assertEquals(1, payments.count());
        assertEquals(2, batches.count());
        assertEquals(2, events.count());
    }

    private List<String> concurrently(SyncRequest first, SyncRequest second) throws Exception {
        var ready = new CountDownLatch(2);
        var start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var futures = List.of(first, second).stream().map(request -> executor.submit(() -> {
                ready.countDown();
                assertTrue(start.await(10, TimeUnit.SECONDS));
                return synchronize(request).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
            })).toList();
            assertTrue(ready.await(10, TimeUnit.SECONDS));
            start.countDown();
            return List.of(futures.get(0).get(20, TimeUnit.SECONDS), futures.get(1).get(20, TimeUnit.SECONDS));
        }
    }

    private void disableTerminal() {
        terminal.setStatus(TerminalStatus.DISABLED);
        terminals.saveAndFlush(terminal);
    }

    private void assertEmptySyncState() {
        assertEquals(0, payments.count());
        assertEquals(0, batches.count());
        assertEquals(0, events.count());
    }
}
