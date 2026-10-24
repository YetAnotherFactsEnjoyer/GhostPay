import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CreditCard,
  Download,
  MoreHorizontal,
  Search,
  X,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { merchantsApi } from "../../merchants/api";
import { terminalsApi } from "../../terminals/api";
import { paymentsApi } from "../api";
import { ErrorState } from "../../../shared/components/ui/ErrorState";
import { EmptyState } from "../../../shared/components/ui/EmptyState";
import { Badge } from "../../../shared/components/ui/Badge";
import { Button } from "../../../shared/components/ui/Button";
import { dateTime, money } from "../../../shared/lib/format";

export function PaymentsPage() {
  const [params] = useSearchParams();
  const [search, setSearch] = useState(params.get("q") ?? "");
  const [status, setStatus] = useState("");
  const [merchantId, setMerchantId] = useState("");
  const [terminalId, setTerminalId] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const merchants = useQuery({
    queryKey: ["merchants"],
    queryFn: merchantsApi.list,
  });
  const terminals = useQuery({
    queryKey: ["terminals", merchantId],
    queryFn: () => terminalsApi.list(merchantId),
    enabled: !!merchantId,
  });
  const payments = useQuery({
    queryKey: ["payments", terminalId],
    queryFn: () => paymentsApi.list(terminalId),
    enabled: !!terminalId,
  });
  useEffect(() => {
    if (!merchantId && merchants.data?.[0]) {
      setMerchantId(merchants.data[0].id);
    }
  }, [merchantId, merchants.data]);
  useEffect(() => {
    if (
      terminals.data?.length &&
      !terminals.data.some((terminal) => terminal.id === terminalId)
    ) {
      setTerminalId(terminals.data[0].id);
      setSelectedId("");
    }
  }, [terminalId, terminals.data]);
  const filteredPayments = useMemo(
    () =>
      (payments.data ?? []).filter(
        (payment) =>
          (!status || payment.status === status) &&
          `${payment.purchaseReference} ${payment.id} ${payment.localPaymentId}`
            .toLowerCase()
            .includes(search.trim().toLowerCase()),
      ),
    [payments.data, search, status],
  );
  const selectedPayment =
    filteredPayments.find((payment) => payment.id === selectedId) ??
    filteredPayments[0];
  const accepted =
    payments.data?.filter((payment) => payment.status === "ACCEPTED").length ??
    0;
  const conflicts =
    payments.data?.filter((payment) => payment.status === "CONFLICT").length ??
    0;
  const totalVolume =
    payments.data?.reduce((sum, payment) => sum + payment.amountMinor, 0) ?? 0;
  const terminalName = terminals.data?.find(
    (terminal) => terminal.id === terminalId,
  )?.name;
  const merchantName = merchants.data?.find(
    (merchant) => merchant.id === merchantId,
  )?.name;
  const changeMerchant = (value: string) => {
    setMerchantId(value);
    setTerminalId("");
    setSelectedId("");
  };

  return (
    <div className="payments-dashboard panel">
      <header className="payments-dashboard-heading">
        <div>
          <span className="eyebrow">PAYMENT OPERATIONS</span>
          <h1>Payments</h1>
          <p className="page-description">
            View and manage all payments across your merchants and terminals.
          </p>
        </div>
        <div className="payments-heading-actions">
          <Button
            secondary
            disabled
            title="Export is not available in this release"
          >
            <Download size={15} /> Export
          </Button>
          <span className="payments-date-range">
            <CalendarDays size={15} /> All time <ChevronDown size={14} />
          </span>
        </div>
      </header>
      {(merchants.error || terminals.error || payments.error) && (
        <ErrorState
          message={
            (merchants.error ?? terminals.error ?? payments.error)!.message
          }
        />
      )}
      <div className="payments-filter-bar">
        <label className="payments-search">
          <Search size={16} />
          <input
            aria-label="Search payments"
            placeholder="Search by reference, terminal, or merchant..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label>
          <select
            aria-label="Merchant"
            value={merchantId}
            onChange={(event) => changeMerchant(event.target.value)}
          >
            <option value="">All merchants</option>
            {merchants.data?.map((merchant) => (
              <option key={merchant.id} value={merchant.id}>
                {merchant.name}
              </option>
            ))}
          </select>
          <ChevronDown size={14} />
        </label>
        <label>
          <select
            aria-label="Terminal"
            value={terminalId}
            onChange={(event) => {
              setTerminalId(event.target.value);
              setSelectedId("");
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
        <label>
          <select
            aria-label="Payment status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">All statuses</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="CONFLICT">Conflict</option>
          </select>
          <ChevronDown size={14} />
        </label>
      </div>
      {!terminalId ? (
        <EmptyState text="Select a merchant and terminal to view payment history." />
      ) : payments.isLoading ? (
        <p className="hint">Loading payments…</p>
      ) : (
        <div className="payments-dashboard-grid">
          <main className="payments-main">
            <div className="payments-stat-grid">
              <div>
                <CreditCard size={20} />
                <strong>{payments.data?.length ?? 0}</strong>
                <span>Total payments</span>
                <small>↗ Current terminal</small>
              </div>
              <div>
                <CreditCard size={20} />
                <strong>{money(totalVolume)}</strong>
                <span>Total volume</span>
                <small>↗ All recorded payments</small>
              </div>
              <div className="accepted">
                <CheckCircle2 size={20} />
                <strong>{accepted}</strong>
                <span>Accepted</span>
                <small>
                  ↗{" "}
                  {payments.data?.length
                    ? Math.round((accepted / payments.data.length) * 100)
                    : 0}
                  % success rate
                </small>
              </div>
              <div className="pending">
                <CircleAlert size={20} />
                <strong>{conflicts}</strong>
                <span>Conflicts</span>
                <small>Needs attention</small>
              </div>
            </div>
            <div className="payments-table-card">
              <div className="payments-table-head">
                <span>Reference</span>
                <span>Amount</span>
                <span>Status</span>
                <span>Terminal</span>
                <span>Merchant</span>
                <span>Date & time</span>
                <span />
              </div>
              {filteredPayments.map((payment) => (
                <button
                  className={
                    selectedPayment?.id === payment.id
                      ? "payment-row selected"
                      : "payment-row"
                  }
                  key={payment.id}
                  onClick={() => setSelectedId(payment.id)}
                >
                  <span className="payment-reference">
                    <i>
                      <CreditCard size={15} />
                    </i>
                    <strong>{payment.purchaseReference}</strong>
                  </span>
                  <strong>
                    {money(payment.amountMinor, payment.currency)}
                  </strong>
                  <Badge tone={payment.status}>
                    {payment.status === "CONFLICT" ? "Failed" : "Accepted"}
                  </Badge>
                  <span>{terminalName ?? payment.terminalId.slice(0, 8)}</span>
                  <span>{merchantName ?? "Selected merchant"}</span>
                  <span className="payment-date">
                    {dateTime(payment.createdAt)}
                  </span>
                  <MoreHorizontal size={17} />
                </button>
              ))}
              {!filteredPayments.length && (
                <EmptyState text="No payments match this view." />
              )}
              <footer className="payments-table-footer">
                <span>
                  Showing {filteredPayments.length} of{" "}
                  {payments.data?.length ?? 0} payments
                </span>
                <span className="payments-pagination">
                  <button disabled aria-label="Previous page">
                    ‹
                  </button>
                  <b>1</b>
                  <button disabled aria-label="Next page">
                    ›
                  </button>
                </span>
              </footer>
            </div>
          </main>
          {selectedPayment && (
            <aside className="payment-detail-rail">
              <div className="payment-detail-heading">
                <Badge tone={selectedPayment.status}>
                  {selectedPayment.status === "CONFLICT"
                    ? "Failed"
                    : "Accepted"}
                </Badge>
                <button
                  aria-label="Close payment details"
                  onClick={() => setSelectedId("")}
                >
                  <X size={17} />
                </button>
              </div>
              <h2>
                {money(selectedPayment.amountMinor, selectedPayment.currency)}
              </h2>
              <div className="payment-detail-list">
                <div>
                  <CalendarDays size={15} />
                  <span>Date & time</span>
                  <strong>{dateTime(selectedPayment.createdAt)}</strong>
                </div>
                <div>
                  <CreditCard size={15} />
                  <span>Terminal</span>
                  <strong>
                    {terminalName ?? selectedPayment.terminalId.slice(0, 8)}
                  </strong>
                </div>
                <div>
                  <CreditCard size={15} />
                  <span>Merchant</span>
                  <strong>{merchantName ?? "Selected merchant"}</strong>
                </div>
                <div>
                  <CheckCircle2 size={15} />
                  <span>Status</span>
                  <strong>{selectedPayment.status}</strong>
                </div>
                <div>
                  <CreditCard size={15} />
                  <span>Reference</span>
                  <strong>{selectedPayment.purchaseReference}</strong>
                </div>
                <div>
                  <CreditCard size={15} />
                  <span>Payment ID</span>
                  <strong title={selectedPayment.id}>
                    {selectedPayment.id.slice(0, 14)}…
                  </strong>
                </div>
              </div>
              <div className="receipt-preview">
                <h3>Receipt preview</h3>
                <div>
                  <strong>{merchantName ?? "Merchant"}</strong>
                  <small>{terminalName ?? "Terminal"}</small>
                  <hr />
                  <span>
                    Reference <b>{selectedPayment.purchaseReference}</b>
                  </span>
                  <span>
                    Date <b>{dateTime(selectedPayment.createdAt)}</b>
                  </span>
                  <span>
                    Amount{" "}
                    <b>
                      {money(
                        selectedPayment.amountMinor,
                        selectedPayment.currency,
                      )}
                    </b>
                  </span>
                  <span>
                    Status <b>{selectedPayment.status}</b>
                  </span>
                </div>
              </div>
              <div className="payment-detail-actions">
                <Button
                  secondary
                  disabled
                  title="Refunds are not supported by this simulator"
                >
                  Refund
                </Button>
                <a
                  className="button"
                  href={`/terminal/${selectedPayment.terminalId}`}
                >
                  View in terminal <ChevronRight size={15} />
                </a>
              </div>
            </aside>
          )}
        </div>
      )}
    </div>
  );
}
