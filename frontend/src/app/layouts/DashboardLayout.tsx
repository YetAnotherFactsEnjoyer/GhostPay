import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { me } from "../../features/auth/auth";
import { auth } from "../../shared/api/client";
import { Header } from "../../shared/components/navigation/Header";
import { Sidebar } from "../../shared/components/navigation/Sidebar";

const titles: Record<string, string> = {
  "/app": "Overview",
  "/app/merchants": "Merchants",
  "/app/terminals": "Terminals",
  "/app/payments": "Payments",
  "/app/sync": "Synchronization",
  "/app/settings": "Settings",
};
export function DashboardLayout() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const account = useQuery({
    queryKey: ["me"],
    queryFn: me,
    enabled: !!auth.get(),
    retry: false,
  });
  return (
    <div
      className="app-shell"
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
      <button
        className="mobile-menu"
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
        aria-controls="workspace-navigation"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      {open && (
        <button
          className="nav-scrim"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <div className={open ? "sidebar-host open" : "sidebar-host"}>
        <Sidebar account={account.data} onNavigate={() => setOpen(false)} />
      </div>
      <div className="main">
        <Header
          title={titles[location.pathname] ?? "GhostPay"}
          account={account.data}
        />
        <Outlet />
      </div>
    </div>
  );
}
