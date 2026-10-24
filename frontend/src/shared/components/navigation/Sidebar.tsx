import {
  Ghost,
  ChevronRight,
  ArrowUpRight,
  CreditCard,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  Settings,
  Store,
  Terminal as TerminalIcon,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { auth } from "../../api/client";
import type { User } from "../../types/api";

const items = [
  { to: "/app", label: "Overview", icon: LayoutDashboard },
  { to: "/app/merchants", label: "Merchants", icon: Store },
  { to: "/app/terminals", label: "Terminals", icon: TerminalIcon },
  { to: "/app/payments", label: "Payments", icon: CreditCard },
  { to: "/app/sync", label: "Synchronization", icon: RefreshCw },
];

export function Sidebar({
  account,
  onNavigate,
}: {
  account?: User;
  onNavigate: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const activeIndex = items.findIndex((item) => item.to === location.pathname);
  const queryClient = useQueryClient();
  const logout = () => {
    auth.clear();
    queryClient.clear();
    navigate("/login");
    onNavigate();
  };
  return (
    <aside className="sidebar" id="workspace-navigation">
      <Link className="brand-row" to="/app" onClick={onNavigate}>
        <div className="brand-mark small">
          <Ghost size={30} />
        </div>
        <span className="sidebar-brand-copy">
          <strong>GhostPay</strong>
          <small>Payment workspace</small>
        </span>
      </Link>
      <div className="side-label">
        Workspace <span>01 — 05</span>
      </div>
      <nav aria-label="Workspace">
        <span
          className="nav-active-marker"
          aria-hidden="true"
          style={{
            transform: `translateY(${Math.max(0, activeIndex) * 51}px)`,
            opacity: activeIndex < 0 ? 0 : 1,
          }}
        />
        {items.map(({ to, label, icon: Icon }) => (
          <Link
            className={location.pathname === to ? "active" : ""}
            aria-current={location.pathname === to ? "page" : undefined}
            to={to}
            key={to}
            onClick={onNavigate}
          >
            <Icon className="nav-icon" size={18} />
            <span className="nav-label">{label}</span>
            <ChevronRight
              className="nav-chevron"
              size={13}
              aria-hidden="true"
            />
          </Link>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <Link
          className={location.pathname === "/app/settings" ? "active" : ""}
          to="/app/settings"
          onClick={onNavigate}
        >
          <Settings size={18} />
          Settings
        </Link>
        <Link
          className="account-chip"
          to="/app/settings"
          onClick={onNavigate}
          aria-label="Your account"
        >
          <span className="account-avatar">
            {account?.email?.[0]?.toUpperCase() ?? "G"}
          </span>
          <span className="sidebar-account-copy">
            <strong>Your account</strong>
            <small>{account?.email ?? "Loading account…"}</small>
          </span>
          <ArrowUpRight
            size={14}
            className="account-arrow"
            aria-hidden="true"
          />
        </Link>
        <button className="logout" onClick={logout}>
          <LogOut size={18} />
          Log out
        </button>
      </div>
    </aside>
  );
}
