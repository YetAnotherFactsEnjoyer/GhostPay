import type { Payment, Terminal } from "../../../shared/types/api";
import { Badge } from "../../../shared/components/ui/Badge";
import { EmptyState } from "../../../shared/components/ui/EmptyState";
import { dateTime, money } from "../../../shared/lib/format";

export function PaymentsTable({
  payments,
  terminals,
}: {
  payments?: Payment[];
  terminals?: Terminal[];
}) {
  if (!payments?.length)
    return <EmptyState text="No payments match this view." />;
  return (
    <div className="table-wrap">
      <table aria-label="Payment history">
        <thead>
          <tr>
            <th>Date</th>
            <th>Payment reference</th>
            <th className="numeric">Amount</th>
            <th>Currency</th>
            <th>Terminal</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <tr key={payment.id}>
              <td className="muted">{dateTime(payment.createdAt)}</td>
              <td>
                <strong>{payment.purchaseReference}</strong>
                <small title={payment.localPaymentId}>
                  {payment.localPaymentId.slice(0, 12)}
                </small>
              </td>
              <td className="numeric">
                {money(payment.amountMinor, payment.currency)}
              </td>
              <td className="muted">{payment.currency}</td>
              <td>
                {terminals?.find(
                  (terminal) => terminal.id === payment.terminalId,
                )?.name ?? payment.terminalId.slice(0, 8)}
              </td>
              <td>
                <Badge tone={payment.status}>{payment.status}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
