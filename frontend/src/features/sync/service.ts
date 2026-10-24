import { z } from "zod";
import { request, auth } from "../../shared/api/client";
import type { SyncResponse } from "../../shared/types/api";
import { db, type LocalPayment } from "./storage";

export const userKey = () => {
  const raw = auth.get()?.split(".")[1];
  if (!raw) return "anonymous";
  try {
    const normalized = raw.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(normalized)).sub as string;
  } catch {
    return "anonymous";
  }
};

export async function queuePayment(
  terminalId: string,
  purchaseReference: string,
  amountMinor: number,
) {
  const userId = userKey();
  if (userId === "anonymous")
    throw new Error("Sign in before recording a payment.");
  if (
    !Number.isSafeInteger(amountMinor) ||
    amountMinor <= 0 ||
    !purchaseReference.trim() ||
    purchaseReference.length > 100
  )
    throw new Error(
      "Enter a positive whole amount and a reference of at most 100 characters.",
    );
  const payment: LocalPayment = {
    userId,
    terminalId,
    localPaymentId: crypto.randomUUID(),
    purchaseReference,
    amountMinor,
    currency: "MYR",
    state: "PENDING",
    createdAt: new Date().toISOString(),
  };
  await db.payments.add(payment);
  return payment;
}

export async function pendingPayments(userId: string, terminalId: string) {
  return db.payments
    .where("[userId+terminalId]")
    .equals([userId, terminalId])
    .filter((p) => ["PENDING", "SYNCING"].includes(p.state))
    .toArray();
}

const responseSchema = z.object({
  batchId: z.string().uuid(),
  results: z.array(
    z.object({
      localPaymentId: z.string().uuid(),
      status: z.enum(["ACCEPTED", "DUPLICATE", "CONFLICT", "INVALID"]),
    }),
  ),
});
const inFlight = new Set<string>();
export async function syncTerminal(
  terminalId: string,
  selectedIds?: string[],
): Promise<SyncResponse | null> {
  const userId = userKey();
  if (userId === "anonymous") throw new Error("Sign in before synchronizing.");
  const key = `${userId}:${terminalId}`;
  if (inFlight.has(key))
    throw new Error(
      "A synchronization is already in progress for this terminal.",
    );
  inFlight.add(key);
  try {
    const run = () => synchronize(userId, terminalId, selectedIds);
    if (navigator.locks)
      return await navigator.locks.request(
        `ghostpay:${key}`,
        { ifAvailable: true },
        (lock) => {
          if (!lock)
            throw new Error(
              "A synchronization is already in progress for this terminal.",
            );
          return run();
        },
      );
    return await run();
  } finally {
    inFlight.delete(key);
  }
}

async function synchronize(
  userId: string,
  terminalId: string,
  selectedIds?: string[],
): Promise<SyncResponse | null> {
  // Claim a batch atomically across tabs before making any network request.
  const prepared = await db.transaction(
    "rw",
    db.payments,
    db.batches,
    async () => {
      const existing = await db.batches
        .where("[userId+terminalId]")
        .equals([userId, terminalId])
        .filter((b) => b.state === "SYNCING")
        .first();
      const local = await db.payments
        .where("[userId+terminalId]")
        .equals([userId, terminalId])
        .toArray();
      const byId = new Map(local.map((p) => [p.localPaymentId, p]));
      if (
        existing &&
        selectedIds &&
        (existing.paymentIds.some((id) => !selectedIds.includes(id)) ||
          selectedIds.some((id) => !existing.paymentIds.includes(id)))
      )
        throw new Error(
          "Retry the interrupted batch before synchronizing a different selection.",
        );
      const pending = existing
        ? existing.paymentIds.map((id) => {
            const payment = byId.get(id);
            if (!payment)
              throw new Error(
                "An interrupted batch is missing a local payment. Queue retained for review.",
              );
            return payment;
          })
        : local
            .filter(
              (p) =>
                p.state === "PENDING" &&
                (!selectedIds || selectedIds.includes(p.localPaymentId)),
            )
            .slice(0, 100);
      if (!pending.length) return null;
      const batchId = existing?.batchId ?? crypto.randomUUID();
      if (!existing)
        await db.batches.add({
          userId,
          terminalId,
          batchId,
          paymentIds: pending.map((p) => p.localPaymentId),
          state: "SYNCING",
          createdAt: new Date().toISOString(),
        });
      for (const payment of pending)
        await db.payments.update(payment.id!, { state: "SYNCING", batchId });
      return { pending, batchId };
    },
  );
  if (!prepared) return null;
  const { pending, batchId } = prepared;
  if (userKey() !== userId)
    throw new Error("Session changed. Sign in again to retry this batch.");
  const result = responseSchema.parse(
    await request<unknown>(`/api/v1/terminals/${terminalId}/sync`, {
      method: "POST",
      body: JSON.stringify({
        batchId,
        payments: pending.map(
          ({ localPaymentId, purchaseReference, amountMinor, currency }) => ({
            localPaymentId,
            purchaseReference,
            amountMinor,
            currency,
          }),
        ),
      }),
    }),
  );
  if (
    result.batchId !== batchId ||
    result.results.length !== pending.length ||
    result.results.some(
      (item, index) => item.localPaymentId !== pending[index].localPaymentId,
    )
  )
    throw new Error(
      "Invalid synchronization response. Queue retained for retry.",
    );
  await db.transaction("rw", db.payments, db.batches, async () => {
    for (const [index, item] of result.results.entries())
      await db.payments.update(pending[index].id!, { state: item.status });
    await db.batches
      .where("[userId+terminalId]")
      .equals([userId, terminalId])
      .filter((b) => b.batchId === batchId)
      .modify({ state: "COMPLETE" });
  });
  return result;
}
