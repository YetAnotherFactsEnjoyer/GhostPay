import type { SyncResponse } from "../../../shared/types/api";
import { Badge } from "../../../shared/components/ui/Badge";

export function SyncResult({ result }: { result: SyncResponse }) {
  const statuses = ["ACCEPTED", "DUPLICATE", "CONFLICT", "INVALID"] as const;
  return (
    <div className="queue-list" aria-live="polite">
      <h3>Last synchronization result</h3>
      <p className="hint batch-id">Batch {result.batchId}</p>
      <div className="filters">
        {statuses.map((status) => {
          const count = result.results.filter(
            (item) => item.status === status,
          ).length;
          return count > 0 ? (
            <Badge key={status} tone={status}>
              {count} {status.toLowerCase()}
            </Badge>
          ) : null;
        })}
      </div>
      {result.results.some(
        (item) => item.status === "CONFLICT" || item.status === "INVALID",
      ) && (
        <p className="hint">
          Review payments requiring attention before recording a replacement.
        </p>
      )}
    </div>
  );
}
