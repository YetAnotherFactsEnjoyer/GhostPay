import { Badge } from "../../../shared/components/ui/Badge";
import type { LocalPayment } from "../../sync/storage";
import { EmptyState } from "../../../shared/components/ui/EmptyState";
import { money } from "../../../shared/lib/format";

export function TerminalActivity({ payments }: { payments: LocalPayment[] }) {
  return (
    <div>
      <h3>Recent locally recorded</h3>
      {payments.map((payment) => (
        <div className="mini-row" key={payment.localPaymentId}>
          <span className="activity-details">
            {payment.purchaseReference}
            <span>
              <Badge tone={payment.state}>{payment.state}</Badge>
            </span>
          </span>
          <strong>{money(payment.amountMinor)}</strong>
        </div>
      ))}
      {!payments.length && (
        <EmptyState text="No locally recorded payments yet." />
      )}
    </div>
  );
}
