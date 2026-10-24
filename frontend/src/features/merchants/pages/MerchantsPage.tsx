import { IdentityMark } from "../../../shared/components/ui/IdentityMark";
import { ArrowUpRight, Plus, Search, Store } from "lucide-react";
import { Link } from "react-router-dom";
import { useRef, useState } from "react";
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { merchantsApi } from "../api";
import { Button } from "../../../shared/components/ui/Button";
import { EmptyState } from "../../../shared/components/ui/EmptyState";
import { ErrorState } from "../../../shared/components/ui/ErrorState";
import { MerchantDetails } from "../components/MerchantDetails";
import { CopyMerchantId } from "../components/CopyMerchantId";
import { terminalsApi } from "../../terminals/api";
import { InputField } from "../../../shared/components/ui/InputField";

export function MerchantsPage() {
  const client = useQueryClient();
  const merchants = useQuery({
    queryKey: ["merchants"],
    queryFn: merchantsApi.list,
  });
  const [name, setName] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const create = useMutation({
    mutationFn: () => merchantsApi.create(name.trim()),
    onSuccess: () => {
      setName("");
      dialog.current?.close();
      void client.invalidateQueries({ queryKey: ["merchants"] });
    },
  });
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [selectedId, setSelectedId] = useState("");
  const terminalQueries = useQueries({
    queries: (merchants.data ?? []).map((merchant) => ({
      queryKey: ["terminals", merchant.id],
      queryFn: () => terminalsApi.list(merchant.id),
    })),
  });
  const visible = (merchants.data ?? [])
    .filter((merchant) =>
      `${merchant.name} ${merchant.id}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : sort === "oldest"
          ? Date.parse(a.createdAt) - Date.parse(b.createdAt)
          : Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );
  const selected =
    visible.find((merchant) => merchant.id === selectedId) ?? visible[0];
  const selectedTerminals =
    terminalQueries[
      merchants.data?.findIndex((merchant) => merchant.id === selected?.id) ??
        -1
    ];
  const openCreate = () => {
    create.reset();
    dialog.current?.showModal();
  };
  return (
    <>
      <div className="merchant-page-actions">
        <p className="muted">
          Manage your businesses and access their payment terminals.
        </p>
        <Button onClick={openCreate}>
          <Plus size={16} /> Add merchant
        </Button>
      </div>
      <div className="merchants-workspace">
        <div className="merchant-directory">
          <div className="merchant-toolbar">
            <label className="merchant-search">
              <Search size={18} />
              <input
                aria-label="Search merchants"
                placeholder="Search merchants…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <select
              aria-label="Sort merchants"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>
          {merchants.error && <ErrorState message={merchants.error.message} />}
          {merchants.isLoading && (
            <div className="overview-skeleton" role="status">
              Loading merchants…
            </div>
          )}
          <div className="merchant-rows" aria-label="Merchants">
            {visible.map((merchant) => {
              const terminalQuery =
                terminalQueries[
                  merchants.data!.findIndex((item) => item.id === merchant.id)
                ];
              return (
                <article
                  className={`merchant-row ${selected?.id === merchant.id ? "selected" : ""}`}
                  key={merchant.id}
                >
                  <button
                    className="merchant-select"
                    onClick={() => setSelectedId(merchant.id)}
                    aria-pressed={selected?.id === merchant.id}
                    aria-label={`Inspect ${merchant.name}`}
                  >
                    <IdentityMark name={merchant.name} identity={merchant.id} />
                    <strong>{merchant.name}</strong>
                  </button>
                  <div className="merchant-row-id">
                    <CopyMerchantId id={merchant.id} />
                  </div>
                  <div className="merchant-row-count">
                    <strong>{terminalQuery?.data?.length ?? "—"}</strong>
                    <small>
                      {terminalQuery?.isError ? "Unavailable" : "Terminals"}
                    </small>
                  </div>
                  <div className="merchant-created">
                    <span>
                      {new Intl.DateTimeFormat("en", {
                        dateStyle: "medium",
                      }).format(new Date(merchant.createdAt))}
                    </span>
                    <small>Created</small>
                  </div>
                  <Link
                    className="merchant-open"
                    to={`/app/terminals?merchantId=${merchant.id}`}
                  >
                    View terminals <ArrowUpRight size={15} />
                  </Link>
                </article>
              );
            })}
          </div>
          {merchants.isSuccess && !visible.length && (
            <EmptyState
              text={
                search
                  ? "No merchants match your search."
                  : "No merchants yet. Add your first business to get started."
              }
            />
          )}
          {merchants.isSuccess && visible.length > 0 && (
            <div className="merchant-list-end">
              <Store size={26} />
              <h3>All merchants shown</h3>
              <p className="muted">
                {visible.length}{" "}
                {visible.length === 1 ? "merchant" : "merchants"}
                {search ? " matching your search" : " in your workspace"}.
              </p>
              <Button onClick={openCreate}>
                <Plus size={16} /> Create another merchant
              </Button>
            </div>
          )}
        </div>
        {selected && (
          <MerchantDetails
            key={selected.id}
            merchant={selected}
            terminals={selectedTerminals?.data}
            error={selectedTerminals?.error}
          />
        )}
      </div>
      <dialog
        ref={dialog}
        className="dialog"
        aria-labelledby="create-merchant-title"
      >
        <h2 id="create-merchant-title">Add a merchant</h2>
        <p className="muted">Create a workspace for your business.</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim().length >= 3) create.mutate();
          }}
        >
          <InputField
            label="Merchant name"
            placeholder="Business name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            minLength={3}
            required
            autoFocus
          />
          {create.error && <ErrorState message={create.error.message} />}
          <div className="dialog-actions">
            <Button
              type="button"
              secondary
              onClick={() => dialog.current?.close()}
            >
              Cancel
            </Button>
            <Button disabled={create.isPending || name.trim().length < 3}>
              {create.isPending ? "Adding…" : "Add merchant"}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
