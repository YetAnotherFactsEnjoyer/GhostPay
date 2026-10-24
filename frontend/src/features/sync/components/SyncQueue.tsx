import type { LocalPayment } from "../storage";
import { Badge } from "../../../shared/components/ui/Badge";
import { dateTime, money } from "../../../shared/lib/format";

const explanations: Record<string, string> = {
  PENDING: "Ready to synchronize",
  SYNCING: "Batch in progress",
  CONFLICT:
    "Reference conflicts with an existing payment. Review before recording a replacement.",
  INVALID: "Payment was rejected. Review its reference and amount.",
};

export function SyncQueue({ payments }: { payments: LocalPayment[] }) {
  if (!payments.length) return null;
  return (
    <div className="queue-list">
      <h3>Payments requiring attention</h3>
      <div className="table-wrap">
        <table aria-label="Local payment queue">
          <thead>
            <tr>
              <th>Payment reference</th>
              <th className="numeric">Amount</th>
              <th>Recorded</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr className="queue-row" key={payment.localPaymentId}>
                <td>
                  <strong>{payment.purchaseReference}</strong>
                  <small className="queue-explanation">
                    {explanations[payment.state]}
                  </small>
                </td>
                <td className="numeric">
                  {money(payment.amountMinor, payment.currency)}
                </td>
                <td className="muted">{dateTime(payment.createdAt)}</td>
                <td>
                  <Badge tone={payment.state}>{payment.state}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
