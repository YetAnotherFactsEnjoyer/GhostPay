import { useEffect, useState } from "react";
import { liveQuery } from "dexie";
import { db, type Batch, type LocalPayment } from "../storage";
import { userKey } from "../service";

// Subscribe to committed local writes, including changes from another tab.
export function useLocalActivity(terminalId?: string) {
  const [payments, setPayments] = useState<LocalPayment[]>();
  const [batches, setBatches] = useState<Batch[]>();
  const [error, setError] = useState<Error>();
  useEffect(() => {
    setPayments(undefined);
    setBatches(undefined);
    setError(undefined);
    const subscription = liveQuery(async () => {
      const userId = userKey();
      const [payments, batches] = await Promise.all([
        db.payments.where("userId").equals(userId).toArray(),
        db.batches.toArray(),
      ]);
      return {
        payments: payments.filter(
          (p) => !terminalId || p.terminalId === terminalId,
        ),
        batches: batches.filter(
          (b) =>
            b.userId === userId && (!terminalId || b.terminalId === terminalId),
        ),
      };
    }).subscribe({
      next: ({ payments, batches }) => {
        setPayments(
          payments.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        );
        setBatches(
          batches.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        );
      },
      error: (failure: Error) => setError(failure),
    });
    return () => subscription.unsubscribe();
  }, [terminalId]);
  return { payments, batches, error };
}
