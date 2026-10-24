import Dexie, { type Table } from "dexie";
import type { SyncResultStatus } from "../../shared/types/api";
export type QueueState = "PENDING" | "SYNCING" | SyncResultStatus;
export interface LocalPayment {
  id?: number;
  userId: string;
  terminalId: string;
  localPaymentId: string;
  purchaseReference: string;
  amountMinor: number;
  currency: "MYR";
  state: QueueState;
  batchId?: string;
  createdAt: string;
}
export interface Batch {
  id?: number;
  userId: string;
  terminalId: string;
  batchId: string;
  paymentIds: string[];
  state: "SYNCING" | "COMPLETE";
  createdAt: string;
}
class GhostPayDB extends Dexie {
  payments!: Table<LocalPayment, number>;
  batches!: Table<Batch, number>;
  constructor() {
    super("ghostpay");
    this.version(1).stores({
      payments: "++id, userId, [userId+terminalId], localPaymentId, batchId",
      batches: "++id, batchId, [userId+terminalId]",
    });
  }
}
export const db = new GhostPayDB();
