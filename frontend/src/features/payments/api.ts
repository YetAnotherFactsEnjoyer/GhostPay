import { request } from "../../shared/api/client";
import type { Payment } from "../../shared/types/api";
export const paymentsApi = {
  list: (terminalId: string) =>
    request<Payment[]>(
      `/api/v1/payments?terminalId=${encodeURIComponent(terminalId)}`,
    ),
};
