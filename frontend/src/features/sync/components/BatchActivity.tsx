import type { Batch } from "../storage";
import { Badge } from "../../../shared/components/ui/Badge";
import { dateTime } from "../../../shared/lib/format";

export function BatchActivity({ batches }: { batches?: Batch[] }) {
  if (!batches?.length) return null;
  return (
    <div className="queue-list">
      <h3>Recent batches on this device</h3>
      <div className="table-wrap">
        <table aria-label="Synchronization batches">
          <thead>
            <tr>
              <th>Batch</th>
              <th>Payments</th>
              <th>State</th>
              <th>Started</th>
            </tr>
          </thead>
          <tbody>
            {batches.slice(0, 5).map((batch) => (
              <tr key={batch.batchId}>
                <td className="batch-id" title={batch.batchId}>
                  {batch.batchId.slice(0, 8)}
                </td>
                <td>{batch.paymentIds.length}</td>
                <td>
                  <Badge
                    tone={batch.state === "COMPLETE" ? "neutral" : "pending"}
                  >
                    {batch.state === "COMPLETE"
                      ? "Completed"
                      : "Awaiting completion"}
                  </Badge>
                </td>
                <td className="muted">{dateTime(batch.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
