import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Clock3,
  Cloud,
  CloudUpload,
  MoreHorizontal,
  RefreshCw,
  Search,
  Smartphone,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { merchantsApi } from "../../merchants/api";
import { terminalsApi } from "../../terminals/api";
import { syncTerminal } from "../service";
import { useLocalActivity } from "../hooks/useLocalActivity";
import { Section } from "../../../shared/components/ui/Section";
import { EmptyState } from "../../../shared/components/ui/EmptyState";
import { ErrorState } from "../../../shared/components/ui/ErrorState";
import { Badge } from "../../../shared/components/ui/Badge";
import { Button } from "../../../shared/components/ui/Button";
import { money, dateTime } from "../../../shared/lib/format";

export function SyncPage() {
  const [merchantId, setMerchantId] = useState("");
  const [terminalId, setTerminalId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [tab, setTab] = useState<"queue" | "history">("queue");
  const [queueSort, setQueueSort] = useState("oldest");
  const client = useQueryClient();
  const merchants = useQuery({
    queryKey: ["merchants"],
    queryFn: merchantsApi.list,
  });
  const terminals = useQuery({
    queryKey: ["terminals", merchantId],
    queryFn: () => terminalsApi.list(merchantId),
    enabled: !!merchantId,
  });
  const local = useLocalActivity(terminalId);
  const payments = local.payments ?? [];
  const requiringAttention = payments
    .filter(
      (payment) => payment.state === "PENDING" || payment.state === "SYNCING",
    )
    .sort((a, b) =>
      queueSort === "oldest"
        ? a.createdAt.localeCompare(b.createdAt)
        : b.createdAt.localeCompare(a.createdAt),
    );
  const conflicts = payments.filter(
    (payment) => payment.state === "CONFLICT" || payment.state === "INVALID",
  );
  const synced = payments.filter(
    (payment) => payment.state === "ACCEPTED" || payment.state === "DUPLICATE",
  );
  const sync = useMutation({
    mutationFn: async (options?: {
      selection?: string[];
      terminalOnly?: boolean;
    }) => {
      const selection = options?.selection;
      const ids = terminals.data?.map((terminal) => terminal.id) ?? [];
      const targets = selection || options?.terminalOnly ? [terminalId] : ids;
      const results = [];
      for (const id of targets) {
        const result = await syncTerminal(id, selection);
        if (result) results.push(result);
      }
      return results;
    },
    onSuccess: () => {
      setSelected([]);
      void client.invalidateQueries({ queryKey: ["payments"] });
    },
  });

  useEffect(() => {
    if (!merchantId && merchants.data?.[0]) setMerchantId(merchants.data[0].id);
  }, [merchantId, merchants.data]);
  useEffect(() => {
    if (
      terminals.data?.length &&
      !terminals.data.some((terminal) => terminal.id === terminalId)
    ) {
      setTerminalId(terminals.data[0].id);
      setSelected([]);
    }
  }, [terminalId, terminals.data]);
  const selectedPayments = useMemo(
    () =>
      requiringAttention.filter((payment) =>
        selected.includes(payment.localPaymentId),
      ),
    [requiringAttention, selected],
  );
  const error = merchants.error ?? terminals.error ?? sync.error ?? local.error;

  const toggleSelected = (id: string) =>
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  const selectMerchant = (value: string) => {
    setMerchantId(value);
    setTerminalId("");
    setSelected([]);
  };
  const terminalName = terminals.data?.find(
    (terminal) => terminal.id === terminalId,
  )?.name;

  return (
    <div className="sync-dashboard panel">
      <header className="sync-dashboard-heading">
        <div>
          <span className="eyebrow">OFFLINE PAYMENTS</span>
          <h1>Synchronization</h1>
          <p className="page-description">
            Sync your offline payments with the server and manage pending
            transactions.
          </p>
        </div>
        <Button
          className="sync-all-button"
          aria-label="Synchronize now"
          onClick={() => sync.mutate()}
          disabled={sync.isPending || !terminals.data?.length}
        >
          <RefreshCw size={16} className={sync.isPending ? "spin" : ""} />
          {sync.isPending ? "Syncing…" : "Sync all"}
        </Button>
      </header>

      <div className="sync-filters">
        <label>
          <Cloud size={15} />
          <select
            aria-label="Merchant"
            value={merchantId}
            onChange={(event) => selectMerchant(event.target.value)}
          >
            <option value="">Select merchant</option>
            {merchants.data?.map((merchant) => (
              <option key={merchant.id} value={merchant.id}>
                {merchant.name}
              </option>
            ))}
          </select>
          <ChevronDown size={14} />
        </label>
        <label>
          <Smartphone size={15} />
          <select
            aria-label="Terminal"
            value={terminalId}
            onChange={(event) => {
              setTerminalId(event.target.value);
              setSelected([]);
            }}
          >
            <option value="">All terminals</option>
            {terminals.data?.map((terminal) => (
              <option key={terminal.id} value={terminal.id}>
                {terminal.name}
              </option>
            ))}
          </select>
          <ChevronDown size={14} />
        </label>
      </div>

      {error && <ErrorState message={error.message} />}
      <div className="sync-stat-grid">
        <div className="sync-stat-card pending">
          <Smartphone size={21} />
          <strong>{requiringAttention.length}</strong>
          <span>Pending payments</span>
          <small>Stored locally</small>
          <ChevronRight size={15} />
        </div>
        <div className="sync-stat-card synced">
          <Check size={21} />
          <strong>{synced.length}</strong>
          <span>Synced payments</span>
          <small>Current terminal</small>
          <ChevronRight size={15} />
        </div>
        <div className="sync-stat-card conflict">
          <AlertTriangle size={21} />
          <strong>{conflicts.length}</strong>
          <span>Conflicts</span>
          <small>Needs review</small>
          <ChevronRight size={15} />
        </div>
        <div className="sync-stat-card last-sync">
          <Clock3 size={21} />
          <strong>{sync.isSuccess ? "Just now" : "—"}</strong>
          <span>Last sync</span>
          <small>{sync.isError ? "Failed" : "Ready"}</small>
          <ChevronRight size={15} />
        </div>
      </div>

      <div className="sync-dashboard-grid">
        <main className="sync-dashboard-main">
          <Section className="sync-queue-card">
            <div className="sync-card-heading">
              <div className="sync-tabs">
                <button
                  className={tab === "queue" ? "active" : ""}
                  onClick={() => setTab("queue")}
                >
                  Pending queue ({requiringAttention.length})
                </button>
                <button
                  className={tab === "history" ? "active" : ""}
                  onClick={() => setTab("history")}
                >
                  Sync history ({local.batches?.length ?? 0})
                </button>
              </div>
              <select
                aria-label="Queue sort"
                value={queueSort}
                onChange={(event) => setQueueSort(event.target.value)}
              >
                <option value="oldest">Oldest first</option>
                <option value="newest">Newest first</option>
              </select>
            </div>
            {tab === "queue" ? (
              <>
                <div className="sync-queue-list">
                  {requiringAttention.map((payment) => (
                    <div
                      className="sync-payment-row"
                      key={payment.localPaymentId}
                    >
                      <button
                        className={
                          selected.includes(payment.localPaymentId)
                            ? "sync-checkbox checked"
                            : "sync-checkbox"
                        }
                        aria-label={`Select ${payment.purchaseReference}`}
                        onClick={() => toggleSelected(payment.localPaymentId)}
                      >
                        {selected.includes(payment.localPaymentId) && (
                          <Check size={14} />
                        )}
                      </button>
                      <span className="sync-payment-icon">
                        <CloudUpload size={18} />
                      </span>
                      <span className="sync-payment-reference">
                        <strong>{payment.purchaseReference}</strong>
                        <small>{dateTime(payment.createdAt)}</small>
                      </span>
                      <strong>
                        {money(payment.amountMinor, payment.currency)}
                      </strong>
                      <span className="sync-payment-terminal">
                        {terminalName ?? "All terminals"}
                        <small>
                          {terminalId ? "Selected terminal" : "Local queue"}
                        </small>
                      </span>
                      <Badge tone={payment.state}>Pending</Badge>
                      <MoreHorizontal size={18} />
                    </div>
                  ))}
                  {!requiringAttention.length && (
                    <EmptyState text="No payments waiting for synchronization." />
                  )}
                </div>
                {selected.length > 0 && (
                  <div className="sync-selected-bar">
                    <Smartphone size={20} />
                    <div>
                      <strong>
                        {selectedPayments.length} payments selected
                      </strong>
                      <small>
                        These payments will be synchronized with the server.
                      </small>
                    </div>
                    <Button
                      onClick={() => sync.mutate({ selection: selected })}
                      disabled={sync.isPending}
                    >
                      <CloudUpload size={15} /> Sync selected
                    </Button>
                    <button
                      aria-label="Clear selection"
                      onClick={() => setSelected([])}
                    >
                      <X size={17} />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="sync-history-list">
                {local.batches?.slice(0, 8).map((batch) => (
                  <div className="sync-history-row" key={batch.batchId}>
                    <span
                      className={
                        batch.state === "COMPLETE"
                          ? "history-icon complete"
                          : "history-icon failed"
                      }
                    >
                      {batch.state === "COMPLETE" ? (
                        <Check size={15} />
                      ) : (
                        <X size={15} />
                      )}
                    </span>
                    <span>
                      <strong>
                        {batch.state === "COMPLETE"
                          ? "Sync completed"
                          : "Sync in progress"}
                      </strong>
                      <small>
                        {batch.paymentIds.length} payments ·{" "}
                        {dateTime(batch.createdAt)}
                      </small>
                    </span>
                    <span>{terminalName ?? "Terminal"}</span>
                    <ChevronRight size={15} />
                  </div>
                ))}
                {!local.batches?.length && (
                  <EmptyState text="No synchronization history on this device." />
                )}
              </div>
            )}
          </Section>
          <Section className="sync-activity-card">
            <div className="sync-card-heading">
              <h2>Recent synchronization activity</h2>
              <a href="#sync-history">
                View all <ChevronRight size={14} />
              </a>
            </div>
            {(local.batches ?? []).slice(0, 4).map((batch) => (
              <div
                className="sync-history-row"
                key={`activity-${batch.batchId}`}
              >
                <span className="history-icon complete">
                  <Check size={15} />
                </span>
                <span>
                  <strong>Sync completed</strong>
                  <small>{batch.paymentIds.length} payments synchronized</small>
                </span>
                <span className="muted">{dateTime(batch.createdAt)}</span>
                <ChevronRight size={15} />
              </div>
            ))}
            {!local.batches?.length && (
              <p className="muted">
                Synchronization activity will appear here after your first sync.
              </p>
            )}
          </Section>
        </main>
        <aside className="sync-dashboard-side">
          <Section className="sync-status-card">
            <h2>Synchronization status</h2>
            <div className="sync-ring">
              <strong>{requiringAttention.length}</strong>
              <small>pending</small>
            </div>
            <h3>Ready to sync</h3>
            <p>{requiringAttention.length} payments waiting to be sent.</p>
            <Button
              onClick={() => sync.mutate({ terminalOnly: true })}
              disabled={sync.isPending || !terminalId}
            >
              <CloudUpload size={15} /> Sync now
            </Button>
            <div className="sync-settings">
              <h3>Sync settings</h3>
              <label>
                <Wifi size={17} />
                <span>
                  <strong>Auto sync when online</strong>
                  <small>Manual synchronization only in this release</small>
                </span>
                <button
                  className="toggle"
                  disabled
                  aria-pressed={false}
                  aria-label="Toggle auto sync"
                >
                  <i />
                </button>
              </label>
              <label>
                <Smartphone size={17} />
                <span>
                  <strong>Sync mobile data</strong>
                  <small>Use Sync now on any available network</small>
                </span>
                <button
                  className="toggle"
                  disabled
                  aria-pressed={false}
                  aria-label="Toggle mobile data sync"
                >
                  <i />
                </button>
              </label>
            </div>
          </Section>
          <Section className="sync-conflicts-card">
            <div className="sync-card-heading">
              <h2>Conflicts ({conflicts.length})</h2>
              <a href="#conflicts">View all</a>
            </div>
            {conflicts.slice(0, 3).map((payment) => (
              <div className="sync-conflict" key={payment.localPaymentId}>
                <div>
                  <CircleAlert size={16} />
                  <strong>{payment.purchaseReference}</strong>
                  <span>
                    {money(payment.amountMinor, payment.currency)} ·{" "}
                    {terminalName ?? "Terminal"}
                  </span>
                </div>
                <p>Payment needs review before it can be accepted.</p>
                <Button
                  secondary
                  disabled
                  title="Conflict editing is not available in this release"
                >
                  <Search size={14} /> Review conflict
                </Button>
              </div>
            ))}
            {!conflicts.length && (
              <p className="muted">No conflicts need review.</p>
            )}
          </Section>
          <div className="sync-connection">
            {navigator.onLine ? <Wifi size={15} /> : <WifiOff size={15} />}{" "}
            {navigator.onLine ? "Network available" : "Offline mode"}
          </div>
        </aside>
      </div>
    </div>
  );
}
