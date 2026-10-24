import {
  Activity,
  Ban,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  Copy,
  ExternalLink,
  MoreHorizontal,
  Plus,
  Search,
  Terminal as TerminalIcon,
  X,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { merchantsApi } from "../../merchants/api";
import { terminalsApi } from "../api";
import type { TerminalStatus } from "../../../shared/types/api";
import { Badge } from "../../../shared/components/ui/Badge";
import { Button } from "../../../shared/components/ui/Button";
import { EmptyState } from "../../../shared/components/ui/EmptyState";
import { ErrorState } from "../../../shared/components/ui/ErrorState";

type Filter = "ALL" | TerminalStatus;

export function TerminalsPage() {
  const [params] = useSearchParams();
  const [merchantId, setMerchantId] = useState(params.get("merchantId") ?? "");
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [selectedId, setSelectedId] = useState("");
  const [showCreate, setShowCreate] = useState(false);
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
  useEffect(() => {
    if (!merchantId && merchants.data?.[0]) {
      setMerchantId(merchants.data[0].id);
    }
  }, [merchantId, merchants.data]);
  const create = useMutation({
    mutationFn: () => terminalsApi.create(name.trim(), merchantId),
    onSuccess: (terminal) => {
      setName("");
      setShowCreate(false);
      setSelectedId(terminal.id);
      void client.invalidateQueries({ queryKey: ["terminals", merchantId] });
    },
  });

  const filteredTerminals = useMemo(
    () =>
      (terminals.data ?? []).filter(
        (terminal) =>
          (filter === "ALL" || terminal.status === filter) &&
          terminal.name.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [filter, query, terminals.data],
  );
  const selectedTerminal =
    filteredTerminals.find((terminal) => terminal.id === selectedId) ??
    filteredTerminals[0];
  const activeCount =
    terminals.data?.filter((terminal) => terminal.status === "ACTIVE").length ??
    0;
  const disabledCount =
    terminals.data?.filter((terminal) => terminal.status === "DISABLED")
      .length ?? 0;

  const selectMerchant = (value: string) => {
    setMerchantId(value);
    setSelectedId("");
    setQuery("");
    setFilter("ALL");
  };

  return (
    <div className="terminals-page panel">
      <div className="terminals-heading">
        <div>
          <span className="eyebrow">PAYMENT INFRASTRUCTURE</span>
          <h1>Terminals</h1>
          <p className="page-description">
            Manage your payment terminals and open them to start accepting
            payments.
          </p>
        </div>
        <Button
          className="terminals-create-button"
          onClick={() => setShowCreate((value) => !value)}
          disabled={!merchantId}
        >
          {showCreate ? <X size={16} /> : <Plus size={16} />}
          {showCreate ? "Close" : "New terminal"}
        </Button>
      </div>

      {showCreate && merchantId && (
        <form
          className="terminal-create-panel"
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim().length >= 3) create.mutate();
          }}
        >
          <div>
            <strong>Create a terminal</strong>
            <p className="muted">Give this terminal a recognizable name.</p>
          </div>
          <input
            aria-label="Terminal name"
            placeholder="e.g. Main Counter"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
          />
          <Button disabled={create.isPending || name.trim().length < 3}>
            <Check size={16} />
            Create
          </Button>
        </form>
      )}

      <div className="terminal-toolbar">
        <label className="merchant-select">
          <Building2 size={17} />
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
          <ChevronDown size={15} aria-hidden="true" />
        </label>
        <label className="terminal-search">
          <Search size={17} aria-hidden="true" />
          <input
            aria-label="Search terminals"
            placeholder="Search terminals..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="terminal-filters" aria-label="Terminal status">
          {(["ALL", "ACTIVE", "DISABLED"] as Filter[]).map((value) => (
            <button
              className={filter === value ? "selected" : ""}
              key={value}
              type="button"
              onClick={() => setFilter(value)}
            >
              {value === "ALL"
                ? "All"
                : value[0] + value.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {(merchants.error || terminals.error || create.error) && (
        <ErrorState
          message={
            (merchants.error ?? terminals.error ?? create.error)!.message
          }
        />
      )}
      {!merchantId && (
        <EmptyState text="Select a merchant to view and create terminals." />
      )}
      {terminals.isLoading && <p className="hint">Loading terminals…</p>}

      {merchantId && terminals.data && (
        <div className="terminal-workspace">
          <div className="terminal-list-column">
            <div className="terminal-summary">
              <div>
                <TerminalIcon size={22} />
                <strong>{terminals.data.length}</strong>
                <span>Total terminals</span>
              </div>
              <div>
                <Circle className="status-icon active" size={18} />
                <strong>{activeCount}</strong>
                <span>Active terminals</span>
              </div>
              <div>
                <Ban className="status-icon disabled" size={20} />
                <strong>{disabledCount}</strong>
                <span>Disabled terminals</span>
              </div>
              <div>
                <Activity size={21} />
                <strong>0</strong>
                <span>Pending payments</span>
              </div>
            </div>

            <div className="terminal-list" aria-label="Terminals">
              {filteredTerminals.map((terminal) => (
                <div
                  className={
                    terminal.id === selectedTerminal?.id
                      ? "terminal-row selected"
                      : "terminal-row"
                  }
                  key={terminal.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedId(terminal.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedId(terminal.id);
                    }
                  }}
                >
                  <span className="terminal-row-icon">
                    <TerminalIcon size={22} />
                  </span>
                  <span className="terminal-row-name">
                    <strong>{terminal.name}</strong>
                    <small>{terminal.id}</small>
                  </span>
                  <Badge tone={terminal.status}>{terminal.status}</Badge>
                  <span className="terminal-row-stat">
                    <strong>—</strong>
                    <small>Total payments</small>
                  </span>
                  <span className="terminal-row-stat">
                    <strong>—</strong>
                    <small>Total volume</small>
                  </span>
                  <span className="terminal-row-action">
                    <Link
                      to={`/terminal/${terminal.id}`}
                      onClick={(event) => event.stopPropagation()}
                    >
                      Open terminal
                    </Link>
                    <MoreHorizontal size={19} aria-label="More actions" />
                  </span>
                </div>
              ))}
              {filteredTerminals.length === 0 && (
                <EmptyState text="No terminals match your filters." />
              )}
            </div>
          </div>

          {selectedTerminal && (
            <aside className="terminal-details-rail">
              <div className="terminal-rail-heading">
                <div>
                  <span className="eyebrow">SELECTED TERMINAL</span>
                  <h2>{selectedTerminal.name}</h2>
                </div>
                <Badge tone={selectedTerminal.status}>
                  {selectedTerminal.status}
                </Badge>
              </div>
              <div className="terminal-preview">
                <TerminalIcon size={58} />
                <span className="preview-display">Ready</span>
                <div className="preview-keypad">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((key) => (
                    <span key={key}>{key}</span>
                  ))}
                </div>
              </div>
              <Link
                className="button terminal-open-button"
                to={`/terminal/${selectedTerminal.id}`}
              >
                <ExternalLink size={16} />
                Open terminal
              </Link>
              <div className="terminal-id-block">
                <span>Terminal ID</span>
                <button
                  type="button"
                  title="Copy terminal ID"
                  onClick={() =>
                    void navigator.clipboard?.writeText(selectedTerminal.id)
                  }
                >
                  <code>{selectedTerminal.id}</code>
                  <Copy size={14} />
                </button>
              </div>
              <div className="terminal-rail-stat">
                <span>
                  <Activity size={18} /> Total payments
                </span>
                <strong>—</strong>
                <ChevronRight size={15} />
              </div>
              <div className="terminal-rail-stat">
                <span>
                  <TerminalIcon size={18} /> Total volume
                </span>
                <strong>—</strong>
                <ChevronRight size={15} />
              </div>
            </aside>
          )}
        </div>
      )}
    </div>
  );
}
