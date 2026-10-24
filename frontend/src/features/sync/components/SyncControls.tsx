import { RefreshCw } from "lucide-react";
import { Button } from "../../../shared/components/ui/Button";
import type { Merchant, Terminal } from "../../../shared/types/api";

export function SyncControls({
  merchants,
  terminals,
  merchantId,
  terminalId,
  syncing,
  onMerchant,
  onTerminal,
  onSync,
}: {
  merchants?: Merchant[];
  terminals?: Terminal[];
  merchantId: string;
  terminalId: string;
  syncing: boolean;
  onMerchant: (id: string) => void;
  onTerminal: (id: string) => void;
  onSync: () => void;
}) {
  return (
    <div className="sync-controls">
      <select
        aria-label="Merchant"
        value={merchantId}
        onChange={(event) => onMerchant(event.target.value)}
      >
        <option value="">Select merchant</option>
        {merchants?.map((merchant) => (
          <option key={merchant.id} value={merchant.id}>
            {merchant.name}
          </option>
        ))}
      </select>
      <select
        aria-label="Terminal"
        value={terminalId}
        onChange={(event) => onTerminal(event.target.value)}
      >
        <option value="">Select terminal</option>
        {terminals?.map((terminal) => (
          <option key={terminal.id} value={terminal.id}>
            {terminal.name}
          </option>
        ))}
      </select>
      <Button disabled={!terminalId || syncing} onClick={onSync}>
        <RefreshCw size={17} />
        {syncing ? "Synchronizing…" : "Synchronize now"}
      </Button>
    </div>
  );
}
