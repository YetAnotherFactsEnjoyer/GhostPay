import "fake-indexeddb/auto";
import { beforeEach, afterAll, describe, expect, it, vi } from "vitest";
import { db } from "./storage";
import { queuePayment, syncTerminal } from "./service";
import { request } from "../../shared/api/client";

const identity = vi.hoisted(() => ({ id: "owner" }));
vi.mock("../../shared/api/client", () => ({
  auth: {
    get: () => `header.${btoa(JSON.stringify({ sub: identity.id }))}.signature`,
  },
  request: vi.fn(),
}));
const mockedRequest = vi.mocked(request);
beforeEach(async () => {
  await db.payments.clear();
  await db.batches.clear();
  identity.id = "owner";
  mockedRequest.mockReset();
});
afterAll(() => db.close());
function accept() {
  mockedRequest.mockImplementation(async (_path, init) => {
    const body = JSON.parse(init!.body as string);
    return {
      batchId: body.batchId,
      results: body.payments.map((p: { localPaymentId: string }) => ({
        localPaymentId: p.localPaymentId,
        status: "ACCEPTED",
      })),
    };
  });
}

describe("durable synchronization", () => {
  it("retries the persisted ID and original order, including after a failed request", async () => {
    // UUID lexical order intentionally differs from insertion order.
    const ids = [
      "ffffffff-ffff-4fff-8fff-ffffffffffff",
      "00000000-0000-4000-8000-000000000000",
    ];
    for (const [index, localPaymentId] of ids.entries())
      await db.payments.add({
        userId: "owner",
        terminalId: "terminal",
        localPaymentId,
        purchaseReference: `ref-${index}`,
        amountMinor: 100,
        currency: "MYR",
        state: "PENDING",
        createdAt: new Date().toISOString(),
      });
    mockedRequest.mockRejectedValueOnce(new Error("connection lost"));
    await expect(syncTerminal("terminal")).rejects.toThrow("connection lost");
    const first = mockedRequest.mock.calls[0][1]!.body;
    expect((await db.batches.toArray())[0].state).toBe("SYNCING");
    accept();
    await syncTerminal("terminal");
    expect(mockedRequest.mock.calls[1][1]!.body).toBe(first);
    expect(
      JSON.parse(first as string).payments.map(
        (p: { localPaymentId: string }) => p.localPaymentId,
      ),
    ).toEqual(ids);
    expect((await db.payments.toArray()).map((p) => p.state)).toEqual([
      "ACCEPTED",
      "ACCEPTED",
    ]);
  });

  it("syncs only selected payments", async () => {
    const first = await queuePayment("terminal", "first", 100);
    await queuePayment("terminal", "second", 200);
    accept();
    await syncTerminal("terminal", [first.localPaymentId]);
    expect((await db.payments.toArray()).map((p) => p.state)).toEqual([
      "ACCEPTED",
      "PENDING",
    ]);
  });

  it("rejects a different selection while preserving an interrupted batch", async () => {
    const first = await queuePayment("terminal", "first", 100);
    const second = await queuePayment("terminal", "second", 200);
    mockedRequest.mockRejectedValueOnce(new Error("lost"));
    await expect(
      syncTerminal("terminal", [first.localPaymentId]),
    ).rejects.toThrow();
    await expect(
      syncTerminal("terminal", [second.localPaymentId]),
    ).rejects.toThrow("interrupted batch");
    expect(mockedRequest).toHaveBeenCalledTimes(1);
    expect(await db.batches.count()).toBe(1);
  });

  it("keeps a batch recoverable when a response is incomplete or mismatched", async () => {
    await queuePayment("terminal", "retain", 100);
    mockedRequest.mockImplementation(async (_path, init) => ({
      batchId: JSON.parse(init!.body as string).batchId,
      results: [],
    }));
    await expect(syncTerminal("terminal")).rejects.toThrow("Queue retained");
    expect((await db.payments.toArray())[0].state).toBe("SYNCING");
    expect((await db.batches.toArray())[0].state).toBe("SYNCING");
  });

  it("never sends another user's pending queue", async () => {
    await queuePayment("terminal", "private", 100);
    identity.id = "other";
    expect(await syncTerminal("terminal")).toBeNull();
    expect(mockedRequest).not.toHaveBeenCalled();
    expect(await db.payments.count()).toBe(1);
  });

  it("limits batches to 100 and retains the remainder", async () => {
    for (let index = 0; index < 101; index++)
      await queuePayment("terminal", `payment-${index}`, 100);
    accept();
    await syncTerminal("terminal");
    expect(await db.payments.filter((p) => p.state === "PENDING").count()).toBe(
      1,
    );
    expect(await db.payments.count()).toBe(101);
  });

  it("rejects invalid amounts and references before storing", async () => {
    for (const amount of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])
      await expect(queuePayment("terminal", "ref", amount)).rejects.toThrow();
    await expect(queuePayment("terminal", " ", 100)).rejects.toThrow();
    await expect(
      queuePayment("terminal", "x".repeat(101), 100),
    ).rejects.toThrow();
    expect(await db.payments.count()).toBe(0);
  });

  it("releases its synchronization guard after a storage failure", async () => {
    await queuePayment("terminal", "ref", 100);
    const transaction = vi
      .spyOn(db, "transaction")
      .mockRejectedValueOnce(new Error("storage unavailable"));
    await expect(syncTerminal("terminal")).rejects.toThrow(
      "storage unavailable",
    );
    transaction.mockRestore();
    accept();
    await expect(syncTerminal("terminal")).resolves.toMatchObject({
      results: [{ status: "ACCEPTED" }],
    });
  });
});
