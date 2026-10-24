import { Wifi, WifiOff, Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useConnectivity } from "../../../features/terminals/hooks/useConnectivity";
import type { User } from "../../types/api";

const descriptions: Record<string, string> = {
  Overview: "Monitor your payments, terminals, and synchronization activity.",
  Merchants: "Manage the businesses in your workspace.",
  Terminals: "Your points of sale, connected in one place.",
  Payments: "Track and review your recorded transactions.",
  Synchronization: "Keep local payments and your backend in step.",
  Settings: "Manage your account and application session.",
};

export function Header({ title, account }: { title: string; account?: User }) {
  const navigate = useNavigate();
  const offline = useConnectivity();
  return (
    <>
      <div className="workspace-topbar">
        <form
          className="workspace-search"
          onSubmit={(event) => {
            event.preventDefault();
            const query = new FormData(event.currentTarget).get("query");
            navigate(
              `/app/payments?q=${encodeURIComponent(String(query ?? ""))}`,
            );
          }}
        >
          <Search size={18} />
          <input
            name="query"
            aria-label="Search payment references"
            placeholder="Search payment references…"
          />
          <button type="submit">Search</button>
        </form>
        <Link className="workspace-account" to="/app/settings">
          <span className="account-avatar">
            {account?.email?.[0]?.toUpperCase() ?? "G"}
          </span>
          <span>
            {account?.email ?? "Your account"}
            <small>Account settings</small>
          </span>
        </Link>
      </div>
      <header className="page-header">
        <div>
          <h1>{title}</h1>
          <p className="page-description">{descriptions[title]}</p>
        </div>
        <div className="header-actions">
          <span className="online">
            {offline ? <WifiOff size={14} /> : <Wifi size={14} />}{" "}
            {offline ? "Offline mode" : "Network available"}
          </span>
          <Link
            className="account-control"
            to="/app/settings"
            aria-label="Account settings"
            title={account?.email}
          >
            <span className="account-avatar">
              {account?.email?.[0]?.toUpperCase() ?? "G"}
            </span>
          </Link>
        </div>
      </header>
    </>
  );
}
