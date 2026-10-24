import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  ClipboardCopy,
  CloudUpload,
  CreditCard,
  Edit3,
  MapPin,
  MoreHorizontal,
  RefreshCw,
  Smartphone,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { merchantsApi } from "../../merchants/api";
import { terminalsApi } from "../api";
import { syncTerminal } from "../../sync/service";
import { useLocalActivity } from "../../sync/hooks/useLocalActivity";
import { SyncResult } from "../../sync/components/SyncResult";
import type { SyncResponse } from "../../../shared/types/api";
import { useConnectivity } from "../hooks/useConnectivity";
import { useTerminalPayments } from "../hooks/useTerminalPayments";
import { TerminalLayout } from "../../../app/layouts/TerminalLayout";
import { Section } from "../../../shared/components/ui/Section";
import { ErrorState } from "../../../shared/components/ui/ErrorState";
import { EmptyState } from "../../../shared/components/ui/EmptyState";
import { PaymentEntry } from "../components/PaymentEntry";
import { Badge } from "../../../shared/components/ui/Badge";
import { Button } from "../../../shared/components/ui/Button";
import { money } from "../../../shared/lib/format";

async function findTerminal(terminalId: string) {
  const merchants = await merchantsApi.list();
  for (const merchant of merchants) {
    const terminal = (await terminalsApi.list(merchant.id)).find(
      (candidate) => candidate.id === terminalId,
    );
    if (terminal) return { terminal, merchant };
  }
  throw new Error("Terminal not found");
}

export function TerminalPage() {
  const { terminalId } = useParams();
  const offline = useConnectivity();
  const client = useQueryClient();
  const terminal = useQuery({
    queryKey: ["terminal", terminalId],
    queryFn: () => findTerminal(terminalId!),
    enabled: !!terminalId,
  });
  const local = useLocalActivity(terminalId);
  const payments = local.payments ?? [];
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResponse>();
  const [tab, setTab] = useState<"payment" | "activity">("payment");
  const pendingCount = payments.filter(
    (payment) => payment.state === "PENDING" || payment.state === "SYNCING",
  ).length;
  const terminalInfo = terminal.data?.terminal;
  const merchant = terminal.data?.merchant;
  const {
    recording,
    message,
    messageKind,
    setMessageKind,
    setMessage,
    record,
  } = useTerminalPayments(terminalId);

  const keypad = (digit: string) =>
    setAmount((current) => {
      if (digit === "C") return "";
      if (digit === "←") return current.slice(0, -1);
      return current.length < 12 ? `${current}${digit}` : current;
    });
  const save = async () => {
    if (await record(reference, amount)) {
      setAmount("");
      setReference("");
    }
  };
  const sync = async () => {
    if (syncing || !terminalId) return;
    setSyncing(true);
    setResult(undefined);
    setMessage("");
    try {
      const response = await syncTerminal(terminalId);
      setResult(response ?? undefined);
      setMessageKind("success");
      if (!response) setMessage("No pending payments.");
      void client.invalidateQueries({ queryKey: ["payments", terminalId] });
    } catch (error) {
      setMessageKind("error");
      setMessage((error as Error).message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <TerminalLayout offline={offline}>
      <div className="terminal-payment-screen">
        <div className="terminal-payment-breadcrumb">
          <Link to="/app/terminals">Terminals</Link>
          <ChevronRight size={14} />
          <span>{terminalInfo?.name ?? "Terminal"}</span>
        </div>
        <header className="terminal-payment-heading">
          <div>
            <div className="terminal-payment-title">
              <h1>{terminalInfo?.name ?? "Loading terminal…"}</h1>
              {terminalInfo && (
                <Badge tone={terminalInfo.status}>{terminalInfo.status}</Badge>
              )}
            </div>
            <p className="muted">
              {terminalInfo?.name ?? "Terminal"} ·{" "}
              {merchant?.name ?? "Payment workspace"}
            </p>
          </div>
          <div className="terminal-payment-actions">
            <Link className="button button-secondary" to="/app/terminals">
              <ArrowLeft size={15} /> Back to terminals
            </Link>
            <Button
              secondary
              disabled
              title="Terminal editing is not available"
            >
              <Edit3 size={15} /> Edit
            </Button>
            <button
              className="icon-button"
              aria-label="More terminal actions"
              disabled
              title="No additional actions are available"
            >
              <MoreHorizontal size={19} />
            </button>
          </div>
        </header>
        {terminal.error && <ErrorState message={terminal.error.message} />}

        <div className="terminal-payment-layout">
          <Section className="terminal-payment-card">
            <div className="terminal-payment-tabs">
              <button
                className={tab === "payment" ? "active" : ""}
                onClick={() => setTab("payment")}
              >
                Payment
              </button>
              <button
                className={tab === "activity" ? "active" : ""}
                onClick={() => setTab("activity")}
              >
                Recent Activity
              </button>
            </div>
            {tab === "payment" ? (
              <PaymentEntry
                amount={amount}
                reference={reference}
                recording={recording}
                disabled={terminalInfo?.status === "DISABLED"}
                onReference={setReference}
                onKeypad={keypad}
                onRecord={save}
              />
            ) : (
              <div className="terminal-activity-panel">
                <h2>Recent activity</h2>
                {payments.slice(0, 8).map((payment) => (
                  <div
                    className="terminal-activity-row"
                    key={payment.localPaymentId}
                  >
                    <span>
                      <CreditCard size={16} /> {payment.purchaseReference}
                    </span>
                    <strong>{money(payment.amountMinor)}</strong>
                    <Badge tone={payment.state}>{payment.state}</Badge>
                  </div>
                ))}
                {!payments.length && (
                  <EmptyState text="No locally recorded payments yet." />
                )}
              </div>
            )}
            {message && (
              <div className={messageKind} role="status">
                {message}
              </div>
            )}
            {terminalInfo?.status === "DISABLED" && (
              <p className="hint">This terminal is disabled.</p>
            )}
          </Section>

          <aside className="terminal-payment-rail">
            <Section className="terminal-info-card">
              <div className="terminal-rail-title">
                <h2>Terminal Information</h2>
                <Button
                  secondary
                  disabled
                  title="Terminal editing is not available"
                >
                  <Edit3 size={14} /> Edit
                </Button>
              </div>
              <div className="terminal-info-row">
                <Smartphone size={16} />
                <span>Terminal ID</span>
                <strong title={terminalInfo?.id}>
                  {terminalInfo?.id.slice(0, 14) ?? "—"}…
                </strong>
                <button
                  aria-label="Copy terminal ID"
                  onClick={() =>
                    terminalInfo &&
                    void navigator.clipboard?.writeText(terminalInfo.id)
                  }
                >
                  <ClipboardCopy size={14} />
                </button>
              </div>
              <div className="terminal-info-row">
                <Smartphone size={16} />
                <span>Name</span>
                <strong>{terminalInfo?.name ?? "—"}</strong>
              </div>
              <div className="terminal-info-row">
                <MapPin size={16} />
                <span>Location</span>
                <strong>{terminalInfo?.name ?? "—"}</strong>
              </div>
              <div className="terminal-info-row">
                <CheckCircle2 size={16} />
                <span>Status</span>
                <strong className="success-text">
                  {terminalInfo?.status ?? "—"}
                </strong>
              </div>
            </Section>
            <Section className="terminal-sync-card">
              <div className="terminal-rail-title">
                <h2>Synchronization</h2>
                <Button onClick={sync} disabled={syncing || pendingCount === 0}>
                  <RefreshCw size={14} /> {syncing ? "Syncing…" : "Sync now"}
                </Button>
              </div>
              <div className="terminal-sync-summary">
                <CloudUpload size={19} />
                <strong>{pendingCount} pending payments</strong>
                <ChevronRight size={15} />
                <small>Stored locally, waiting to sync</small>
              </div>
              {result && <SyncResult result={result} />}
            </Section>
            <Section className="terminal-recent-card">
              <div className="terminal-rail-title">
                <h2>Recent Payments</h2>
                <a href="#recent-activity">View all</a>
              </div>
              {payments.slice(0, 5).map((payment) => (
                <div
                  className="terminal-recent-row"
                  key={payment.localPaymentId}
                >
                  <span className="terminal-recent-icon">
                    <CreditCard size={14} />
                  </span>
                  <span>
                    <strong>{money(payment.amountMinor)}</strong>
                    <small>{payment.purchaseReference}</small>
                  </span>
                  <span className="muted">
                    {new Date(payment.createdAt).toLocaleTimeString("en", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <Badge tone={payment.state}>{payment.state}</Badge>
                </div>
              ))}
              {!payments.length && <EmptyState text="No recent payments." />}
            </Section>
            <div className="terminal-payment-connection">
              {offline ? <WifiOff size={14} /> : <Wifi size={14} />}{" "}
              {offline ? "Offline mode" : "Network available"}
            </div>
          </aside>
        </div>
      </div>
    </TerminalLayout>
  );
}
