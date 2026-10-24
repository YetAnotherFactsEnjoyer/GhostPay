import type { Payment, Terminal } from "../../../shared/types/api";

export function dailyVolume(
  payments: Payment[],
  currency: string,
  limit: number,
) {
  const days = new Map<string, number>();
  payments
    .filter((p) => p.status === "ACCEPTED" && p.currency === currency)
    .forEach((p) => {
      const day = new Date(p.createdAt).toISOString().slice(0, 10);
      days.set(day, (days.get(day) ?? 0) + p.amountMinor);
    });
  return [...days]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-limit)
    .map(([day, amountMinor]) => ({ day, amountMinor }));
}

export function terminalPaymentCounts(
  payments: Payment[],
  terminals: Terminal[],
) {
  return terminals
    .map((terminal) => ({
      id: terminal.id,
      name: terminal.name,
      count: payments.filter(
        (p) => p.terminalId === terminal.id && p.status === "ACCEPTED",
      ).length,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
