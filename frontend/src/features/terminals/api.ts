import { request } from "../../shared/api/client";
import type { Terminal } from "../../shared/types/api";
export const terminalsApi = {
  list: (merchantId: string) =>
    request<Terminal[]>(
      `/api/v1/terminals?merchantId=${encodeURIComponent(merchantId)}`,
    ),
  create: (name: string, merchantId: string) =>
    request<Terminal>("/api/v1/terminals", {
      method: "POST",
      body: JSON.stringify({ name, merchantId }),
    }),
};
