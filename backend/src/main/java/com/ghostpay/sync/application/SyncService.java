package com.ghostpay.sync.application;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ghostpay.payment.domain.Payment;
import com.ghostpay.payment.domain.PaymentStatus;
import com.ghostpay.payment.persistence.PaymentRepository;
import com.ghostpay.sync.api.dto.OfflinePaymentRequest;
import com.ghostpay.sync.api.dto.SyncItemResponse;
import com.ghostpay.sync.api.dto.SyncRequest;
import com.ghostpay.sync.api.dto.SyncResponse;
import com.ghostpay.sync.domain.SyncBatch;
import com.ghostpay.sync.domain.SyncEvent;
import com.ghostpay.sync.domain.SyncResultStatus;
import com.ghostpay.sync.persistence.SyncBatchRepository;
import com.ghostpay.sync.persistence.SyncEventRepository;
import com.ghostpay.terminal.domain.Terminal;
import com.ghostpay.terminal.domain.TerminalStatus;
import com.ghostpay.terminal.persistence.TerminalRepository;
import tools.jackson.core.JacksonException;
import com.ghostpay.sync.domain.exception.BatchConflictException;
import com.ghostpay.terminal.domain.exception.TerminalDisabledException;
import com.ghostpay.terminal.domain.exception.TerminalNotFoundException;
import tools.jackson.databind.ObjectMapper;
import java.util.HexFormat;


@Service
public class SyncService {

    private final TerminalRepository terminalRepository;
    private final PaymentRepository paymentRepository;
    private final SyncBatchRepository syncBatchRepository;
    private final SyncEventRepository syncEventRepository;
    private final ObjectMapper objectMapper;

    public SyncService(
        TerminalRepository terminalRepository,
        PaymentRepository paymentRepository,
        SyncBatchRepository syncBatchRepository,
        SyncEventRepository syncEventRepository,
        ObjectMapper objectMapper
    ) {
        this.terminalRepository = terminalRepository;
        this.paymentRepository = paymentRepository;
        this.syncBatchRepository = syncBatchRepository;
        this.syncEventRepository = syncEventRepository;
        this.objectMapper = objectMapper;
    }


  @Transactional
  public SyncResponse synchronize(UUID terminalId, UUID ownerId, SyncRequest request) {
    Terminal terminal = loadAuthorizedTerminal(terminalId, ownerId);
    String requestHash = hashRequest(request);

    Optional<SyncResponse> replay = replayExistingBatch(
        terminal,
        request,
        requestHash
    );

    if (replay.isPresent())
      return replay.get();

    if (terminal.getStatus() != TerminalStatus.ACTIVE)
      throw new TerminalDisabledException("Terminal is not active");

    return processNewBatch(terminal, request, requestHash);
  }

  public Terminal loadAuthorizedTerminal(UUID terminalId, UUID ownerId) {
    Terminal terminal = terminalRepository
      .findByIdForUpdate(terminalId)
      .orElseThrow(() -> new TerminalNotFoundException("Terminal not found"));

    UUID currentId = terminal.getMerchant().getOwner().getId();

    if (!currentId.equals(ownerId)) {
      throw new TerminalNotFoundException("Terminal not found");
    }

    return terminal;
  }

  public boolean samePaymentDetails(Payment payment, OfflinePaymentRequest item) {
    return payment.getPurchaseReference().equals(item.purchaseReference())
      && payment.getAmountMinor() == item.amountMinor()
      && payment.getCurrency().equals(item.currency());
  }

  private SyncResultStatus processPayment(Terminal terminal, OfflinePaymentRequest item) {
    Optional<Payment> payment = paymentRepository
      .findByTerminal_IdAndLocalPaymentId(terminal.getId(), item.localPaymentId());

    if (payment.isPresent()) {
      Payment existingPayment = payment.get();
      if (samePaymentDetails(existingPayment, item))
        return SyncResultStatus.DUPLICATE;
      return SyncResultStatus.CONFLICT;
    }

    Payment newPayment = new Payment(
      terminal,
      item.localPaymentId(),
      item.purchaseReference(),
      item.amountMinor(),
      item.currency(),
      PaymentStatus.ACCEPTED
    );

    paymentRepository.save(newPayment);
    return SyncResultStatus.ACCEPTED;
  }

  private SyncResponse replayBatch(SyncBatch batch) {
    List<SyncEvent> events = syncEventRepository
      .findByBatch_IdOrderByPositionAsc(batch.getId());

    List<SyncItemResponse> results = new ArrayList<>();

    for (SyncEvent event : events) {
      SyncItemResponse item = new SyncItemResponse(
        event.getLocalPaymentId(),
        event.getResultStatus()
      );
      results.add(item);
    }

    return new SyncResponse(
      batch.getBatchId(),
      results
    );
  }

  private String hashRequest(SyncRequest request) {
    try {
      byte[] requestBytes = objectMapper.writeValueAsBytes(request);
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] hashBytes = digest.digest(requestBytes);
      return HexFormat.of().formatHex(hashBytes);
    } catch (JacksonException | NoSuchAlgorithmException exception) {
      throw new IllegalStateException("Failed to generate request hash", exception);
    }
  }

  private Optional<SyncResponse> replayExistingBatch(
    Terminal terminal,
    SyncRequest request,
    String requestHash
  ) {
    Optional<SyncBatch> existingBatch = syncBatchRepository
      .findByTerminal_IdAndBatchId(terminal.getId(),request.batchId());

    if (existingBatch.isEmpty())
      return Optional.empty();

    SyncBatch batch = existingBatch.get();

    if (!batch.getRequestHash().equals(requestHash))
      throw new BatchConflictException("Batch ID already used with different payment data");

    return Optional.of(replayBatch(batch));
  }


  private SyncResponse processNewBatch(
      Terminal terminal,
      SyncRequest request,
      String requestHash
  ) {
    SyncBatch batch = new SyncBatch(
      request.batchId(),
      terminal,
      requestHash
    );

    batch = syncBatchRepository.save(batch);

    List<SyncItemResponse> results = new ArrayList<>();

    List<OfflinePaymentRequest> payments = request.payments();

    for (int position = 0; position < payments.size(); position++) {
      OfflinePaymentRequest item = payments.get(position);
      SyncResultStatus status = processPayment(terminal, item);

      SyncEvent event = new SyncEvent(
        batch,
        position,
        item.localPaymentId(),
        status
      );

      syncEventRepository.save(event);

      results.add(new SyncItemResponse(
        item.localPaymentId(),
         status
      ));
    }

    return new SyncResponse(
      request.batchId(),
      results
    );
}

}
