import {
  ChartNoAxesColumn,
  ReceiptText,
  Monitor,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { Payment } from "../../../shared/types/api";
import { money } from "../../../shared/lib/format";

export function DashboardStats({
  payments,
  pending,
  active,
}: {
  payments?: Payment[];
  pending?: number;
  active?: number;
}) {
  const accepted = payments?.filter((payment) => payment.status === "ACCEPTED");
  const totals = new Map<string, number>();
  accepted?.forEach((payment) =>
    totals.set(
      payment.currency,
      (totals.get(payment.currency) ?? 0) + payment.amountMinor,
    ),
  );
  return (
    <section className="stats" aria-label="Payment summary">
      <div className="stat">
        <span className="stat-label">
          <ChartNoAxesColumn size={18} /> Total volume
        </span>
        <strong>
          {payments
            ? totals.size
              ? [...totals]
                  .map(([currency, total]) => money(total, currency))
                  .join(" · ")
              : money(0)
            : "—"}
        </strong>
        <small>Accepted payments · all time</small>
      </div>
      <div className="stat">
        <span className="stat-label">
          <ReceiptText size={18} /> Total payments
        </span>
        <strong>{payments?.length ?? "—"}</strong>
        <small>
          {payments
            ? `${payments.length} recorded in total`
            : "Selected merchant"}
        </small>
      </div>
      <div className="stat">
        <span className="stat-label">
          <Monitor size={18} />
          Active terminals
        </span>
        <strong>{active ?? "—"}</strong>
        <small>Configured as active</small>
      </div>
      <Link className="stat pending-stat" to="/app/sync">
        <span className="stat-label">
          <RefreshCw size={18} /> Pending sync
        </span>
        <strong>{pending ?? "—"}</strong>
        <small>This device · selected merchant →</small>
      </Link>
    </section>
  );
}
