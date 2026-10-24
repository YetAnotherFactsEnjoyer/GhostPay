import { request } from "../../shared/api/client";
import type { Merchant } from "../../shared/types/api";
export const merchantsApi = {
  list: () => request<Merchant[]>("/api/v1/merchants"),
  create: (name: string) =>
    request<Merchant>("/api/v1/merchants", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
};
