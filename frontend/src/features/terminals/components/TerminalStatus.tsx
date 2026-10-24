import { RefreshCw } from "lucide-react";
import { Badge } from "../../../shared/components/ui/Badge";
import { Button } from "../../../shared/components/ui/Button";

export function TerminalStatus({
  offline,
  pendingCount,
  syncing,
  onSync,
}: {
  offline: boolean;
  pendingCount: number;
  syncing: boolean;
  onSync: () => void;
}) {
  return (
    <div className="section-heading">
      <div>
        <h3>Queue status</h3>
        <p className="queue-count">
          {pendingCount} pending {pendingCount === 1 ? "payment" : "payments"}
        </p>
      </div>
      <Badge tone={syncing ? "syncing" : offline ? "pending" : "neutral"}>
        {syncing ? "Syncing" : offline ? "Offline" : "Network available"}
      </Badge>
      <Button
        secondary
        disabled={syncing || pendingCount === 0}
        onClick={onSync}
      >
        <RefreshCw size={17} />
        {syncing ? "Synchronizing…" : "Synchronize now"}
      </Button>
    </div>
  );
}
