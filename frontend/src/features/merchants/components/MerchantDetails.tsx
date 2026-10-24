import { useQueries } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Store, Monitor, ReceiptText, ChartNoAxesColumn } from "lucide-react";
import type { Merchant, Terminal } from "../../../shared/types/api";
import { paymentsApi } from "../../payments/api";
import { IdentityMark } from "../../../shared/components/ui/IdentityMark";
import { ErrorState } from "../../../shared/components/ui/ErrorState";
import { dateTime, money } from "../../../shared/lib/format";
import { CopyMerchantId } from "./CopyMerchantId";

export function MerchantDetails({
  merchant,
  terminals,
  error,
}: {
  merchant: Merchant;
  terminals?: Terminal[];
  error?: Error | null;
}) {
  const queries = useQueries({
    queries: (terminals ?? []).map((terminal) => ({
      queryKey: ["payments", terminal.id],
      queryFn: () => paymentsApi.list(terminal.id),
    })),
  });
  const ready =
    terminals !== undefined && queries.every((query) => query.isSuccess);
  const payments = queries.flatMap((query) => query.data ?? []);
  const totals = new Map<string, number>();
  payments
    .filter((p) => p.status === "ACCEPTED")
    .forEach((p) =>
      totals.set(p.currency, (totals.get(p.currency) ?? 0) + p.amountMinor),
    );
  const failure = error ?? queries.find((query) => query.error)?.error;
  return (
    <aside className="panel merchant-details" aria-label="Selected merchant">
      <div className="merchant-cover" aria-hidden="true">
        <Store size={64} strokeWidth={1} />
        <span>MERCHANT WORKSPACE</span>
      </div>
      <div className="merchant-detail-identity">
        <IdentityMark name={merchant.name} identity={merchant.id} />
      </div>
      <h2>{merchant.name}</h2>
      <CopyMerchantId id={merchant.id} full />
      <p className="hint">Created {dateTime(merchant.createdAt)}</p>
      {failure && <ErrorState message={failure.message} />}
      <dl className="merchant-metrics">
        <div>
          <Monitor size={21} />
          <dt>Terminals</dt>
          <dd>{terminals?.length ?? "—"}</dd>
        </div>
        <div>
          <ReceiptText size={21} />
          <dt>Total payments</dt>
          <dd>{ready ? payments.length : "—"}</dd>
        </div>
        <div>
          <ChartNoAxesColumn size={21} />
          <dt>Accepted volume · all time</dt>
          <dd>
            {ready
              ? totals.size
                ? [...totals]
                    .map(([currency, total]) => money(total, currency))
                    .join(" · ")
                : money(0)
              : "—"}
          </dd>
        </div>
      </dl>
      <h3>Quick actions</h3>
      <Link className="button" to={`/app/terminals?merchantId=${merchant.id}`}>
        <Monitor size={17} />
        View terminals
      </Link>
    </aside>
  );
}
