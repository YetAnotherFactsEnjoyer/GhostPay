import { describe, expect, it } from "vitest";
import type { Payment, Terminal } from "../../../shared/types/api";
import { dailyVolume, terminalPaymentCounts } from "./chartData";

const payment: Payment = {
  id: "p1",
  terminalId: "t1",
  localPaymentId: "l1",
  purchaseReference: "ORDER-1",
  amountMinor: 12501,
  currency: "MYR",
  status: "ACCEPTED",
  createdAt: "2026-10-01T12:00:00Z",
};
const terminals: Terminal[] = [
  {
    id: "t1",
    merchantId: "m1",
    name: "Counter",
    status: "ACTIVE",
    createdAt: payment.createdAt,
  },
  {
    id: "t2",
    merchantId: "m1",
    name: "Unused",
    status: "DISABLED",
    createdAt: payment.createdAt,
  },
];

describe("chart aggregation", () => {
  it("groups accepted minor-unit amounts by UTC date without mixing currencies or conflicts", () => {
    const payments: Payment[] = [
      payment,
      {
        ...payment,
        id: "p2",
        amountMinor: 99,
        createdAt: "2026-10-02T01:00:00+02:00",
      },
      { ...payment, id: "p3", currency: "USD" },
      { ...payment, id: "p4", status: "CONFLICT" },
      { ...payment, id: "p5", createdAt: "2026-10-03T12:00:00Z" },
    ];
    expect(dailyVolume(payments, "MYR", 14)).toEqual([
      { day: "2026-10-01", amountMinor: 12600 },
      { day: "2026-10-03", amountMinor: 12501 },
    ]);
    expect(dailyVolume(payments, "MYR", 1)).toEqual([
      { day: "2026-10-03", amountMinor: 12501 },
    ]);
    expect(dailyVolume([], "MYR", 14)).toEqual([]);
  });
  it("compares accepted counts across currencies and retains terminals without payments", () => {
    expect(
      terminalPaymentCounts(
        [
          payment,
          { ...payment, id: "p2", currency: "USD" },
          { ...payment, id: "p3", terminalId: "t2", status: "CONFLICT" },
        ],
        terminals,
      ),
    ).toEqual([
      { id: "t1", name: "Counter", count: 2 },
      { id: "t2", name: "Unused", count: 0 },
    ]);
  });
});
