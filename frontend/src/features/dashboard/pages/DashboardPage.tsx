import { Monitor, ReceiptText, RefreshCw } from "lucide-react";
import { IdentityMark } from "../../../shared/components/ui/IdentityMark";
import { Link } from "react-router-dom";
import { Section } from "../../../shared/components/ui/Section";
import { Badge } from "../../../shared/components/ui/Badge";
import { ErrorState } from "../../../shared/components/ui/ErrorState";
import { MerchantSelector } from "../components/MerchantSelector";
import { PaymentVolume } from "../components/PaymentVolume";
import { TerminalPaymentsChart } from "../components/TerminalPaymentsChart";
import { DashboardStats } from "../components/DashboardStats";
import { useDashboard } from "../hooks/useDashboard";
import { dateTime, money } from "../../../shared/lib/format";

export function DashboardPage() {
  const data = useDashboard();
  const { payments, terminals, selected } = data;
  const attention = data.localPayments?.filter(
    (p) => p.state === "CONFLICT" || p.state === "INVALID",
  ).length;
  if (data.merchants.isSuccess && !data.merchants.data.length)
    return (
      <Section>
        <h2>No merchants yet</h2>
        <p>Create your first merchant to start managing payment terminals.</p>
        <Link className="button" to="/app/merchants">
          Create merchant
        </Link>
      </Section>
    );
  return (
    <div className="overview-workspace">
      {data.merchants.error && (
        <ErrorState message={data.merchants.error.message} />
      )}
      <MerchantSelector
        merchants={data.merchants.data}
        selected={selected}
        onSelect={(m) => data.selectMerchant(m.id)}
      />
      <DashboardStats
        payments={payments}
        pending={data.pending}
        active={terminals.data?.filter((t) => t.status === "ACTIVE").length}
      />
      <Section className="overview-recent">
        <div className="section-heading">
          <div>
            <h2 className="icon-heading">
              <ReceiptText size={18} />
              Recent payments
            </h2>
            <p className="muted">
              Latest payments recorded across your selected merchant’s
              terminals.
            </p>
          </div>
          <Link className="text-link" to="/app/payments">
            View all →
          </Link>
        </div>
        {data.paymentError ? (
          <>
            <ErrorState message={data.paymentError.message} />
            <button
              className="button button-secondary"
              onClick={data.retryPayments}
            >
              Retry payments
            </button>
          </>
        ) : data.loadingPayments ? (
          <div className="overview-skeleton" role="status">
            Loading payment history…
          </div>
        ) : payments?.length ? (
          <div className="table-wrap overview-payments">
            <table aria-label="Recent payments">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Terminal</th>
                  <th className="numeric">Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.slice(0, 6).map((p) => (
                  <tr key={p.id}>
                    <td data-label="Reference">
                      <span
                        className="payment-reference"
                        title={p.purchaseReference}
                      >
                        {p.purchaseReference}
                      </span>
                    </td>
                    <td data-label="Terminal">
                      <span className="identified-name">
                        <IdentityMark name="Terminal" identity={p.terminalId}>
                          <Monitor size={14} />
                        </IdentityMark>
                        {terminals.data?.find((t) => t.id === p.terminalId)
                          ?.name ?? p.terminalId}
                      </span>
                    </td>
                    <td data-label="Amount" className="numeric">
                      {money(p.amountMinor, p.currency)}
                    </td>
                    <td data-label="Status">
                      <Badge tone={p.status}>{p.status}</Badge>
                    </td>
                    <td data-label="Date" className="muted">
                      {dateTime(p.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : payments ? (
          <>
            <h3>No payments recorded</h3>
            <p className="muted">
              Payments recorded through your terminals will appear here.
            </p>
            <Link className="text-link" to="/app/terminals">
              Open a terminal →
            </Link>
          </>
        ) : (
          <p className="muted">
            Payment history is unavailable until terminal information is loaded.
          </p>
        )}
      </Section>
      <div className="overview-operations">
        <Section className="overview-terminal-panel">
          <div className="section-heading">
            <h2 className="icon-heading">
              <Monitor size={18} />
              Your terminals
            </h2>
            <Link
              className="text-link"
              to={`/app/terminals${selected ? `?merchantId=${selected.id}` : ""}`}
            >
              Manage terminals →
            </Link>
          </div>
          {terminals.error && (
            <>
              <ErrorState message={terminals.error.message} />
              <button
                className="button button-secondary"
                onClick={() => void terminals.refetch()}
              >
                Retry terminals
              </button>
            </>
          )}
          {terminals.isLoading && (
            <div className="overview-skeleton" role="status">
              Loading terminals…
            </div>
          )}
          {terminals.data?.slice(0, 5).map((t) => (
            <div className="overview-terminal" key={t.id}>
              <IdentityMark name={t.name} identity={t.id}>
                <Monitor size={18} />
              </IdentityMark>
              <div>
                <strong>{t.name}</strong>
                <small className="muted">
                  {data.localPayments?.filter(
                    (p) =>
                      p.terminalId === t.id &&
                      (p.state === "PENDING" || p.state === "SYNCING"),
                  ).length ?? "—"}{" "}
                  pending locally
                </small>
              </div>
              <Badge tone={t.status}>{t.status}</Badge>
              <Link className="text-link" to={`/terminal/${t.id}`}>
                {t.status === "ACTIVE" ? "Open" : "View"} →
              </Link>
            </div>
          ))}
          {terminals.isSuccess && !terminals.data.length && (
            <p className="muted">
              No terminals available. Create a terminal to record payments.
            </p>
          )}
        </Section>
        <Section className="overview-sync-panel">
          <div className="section-heading">
            <h2 className="icon-heading">
              <RefreshCw size={18} />
              Synchronization
            </h2>
            <Link className="text-link" to="/app/sync">
              View sync center →
            </Link>
          </div>
          {data.localError ? (
            <ErrorState message={data.localError.message} />
          ) : (
            <>
              <div className="settings-row">
                <span>Pending payments</span>
                <strong>{data.pending ?? "—"}</strong>
              </div>
              <div className="settings-row">
                <span>Payments requiring attention</span>
                <strong>{attention ?? "—"}</strong>
              </div>
              {data.latestBatch && (
                <p className="hint">
                  Latest local batch:{" "}
                  {data.latestBatch.state === "COMPLETE"
                    ? "Completed"
                    : "Awaiting completion"}{" "}
                  · started {dateTime(data.latestBatch.createdAt)}
                </p>
              )}
              {!!attention && (
                <Link className="text-link" to="/app/sync">
                  Review conflicts →
                </Link>
              )}
              {data.pending === 0 && !attention && (
                <>
                  <h3>All caught up</h3>
                  <p className="muted">
                    No local payments are waiting for synchronization for this
                    merchant on this device.
                  </p>
                </>
              )}
              {!!data.pending && (
                <Link className="text-link" to="/app/sync">
                  Go to synchronization →
                </Link>
              )}
            </>
          )}
        </Section>
      </div>
      {!!payments?.length && (
        <div className="overview-analytics">
          <PaymentVolume payments={payments} />
          <TerminalPaymentsChart
            payments={payments}
            terminals={terminals.data}
          />
        </div>
      )}
    </div>
  );
}
