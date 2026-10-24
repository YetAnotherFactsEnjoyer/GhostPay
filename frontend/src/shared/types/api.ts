export type TerminalStatus = "ACTIVE" | "DISABLED";
export type PaymentStatus = "ACCEPTED" | "CONFLICT";
export type SyncResultStatus =
  | "ACCEPTED"
  | "DUPLICATE"
  | "CONFLICT"
  | "INVALID";

export interface Merchant {
  id: string;
  name: string;
  createdAt: string;
}
export interface Terminal {
  id: string;
  merchantId: string;
  name: string;
  status: TerminalStatus;
  createdAt: string;
}
export interface Payment {
  id: string;
  terminalId: string;
  localPaymentId: string;
  purchaseReference: string;
  amountMinor: number;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
}
export interface User {
  id: string;
  email: string;
}
export interface ApiError {
  code: string;
  message: string;
  timestamp: string;
}
export interface SyncItem {
  localPaymentId: string;
  status: SyncResultStatus;
}
export interface SyncResponse {
  batchId: string;
  results: SyncItem[];
}
