import { useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { merchantsApi } from "../../merchants/api";
import { terminalsApi } from "../../terminals/api";
import { paymentsApi } from "../../payments/api";
import { useLocalActivity } from "../../sync/hooks/useLocalActivity";

export function useDashboard() {
  const [selectedId, selectMerchant] = useState(
    () => sessionStorage.getItem("ghostpay_merchant") ?? "",
  );
  const merchants = useQuery({
    queryKey: ["merchants"],
    queryFn: merchantsApi.list,
  });
  const selected =
    merchants.data?.find((m) => m.id === selectedId) ?? merchants.data?.[0];
  const terminals = useQuery({
    queryKey: ["terminals", selected?.id],
    queryFn: () => terminalsApi.list(selected!.id),
    enabled: !!selected,
  });
  const queries = useQueries({
    queries: (terminals.data ?? []).map((terminal) => ({
      queryKey: ["payments", terminal.id],
      queryFn: () => paymentsApi.list(terminal.id),
    })),
  });
  const ready = terminals.isSuccess && queries.every((q) => q.isSuccess);
  const payments = ready
    ? queries
        .flatMap((q) => q.data ?? [])
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    : undefined;
  const local = useLocalActivity();
  const ids = new Set(terminals.data?.map((t) => t.id));
  const localPayments = local.payments?.filter((p) => ids.has(p.terminalId));
  const pending = localPayments?.filter(
    (p) => p.state === "PENDING" || p.state === "SYNCING",
  );
  return {
    merchants,
    selected,
    selectMerchant: (id: string) => {
      sessionStorage.setItem("ghostpay_merchant", id);
      selectMerchant(id);
    },
    localError: local.error,
    paymentError: queries.find((q) => q.error)?.error,
    retryPayments: () => queries.forEach((q) => void q.refetch()),
    latestBatch: terminals.isSuccess
      ? local.batches?.find((b) => ids.has(b.terminalId))
      : undefined,
    terminals,
    payments,
    localPayments,
    pending: terminals.isSuccess ? pending?.length : undefined,
    loadingPayments: terminals.isLoading || queries.some((q) => q.isLoading),
    error:
      merchants.error ??
      terminals.error ??
      queries.find((q) => q.error)?.error ??
      local.error,
  };
}
