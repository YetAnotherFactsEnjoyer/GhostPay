import { ArrowLeft, Wifi, WifiOff } from "lucide-react";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";

export function TerminalLayout({
  children,
  offline,
}: {
  children: ReactNode;
  offline: boolean;
}) {
  return (
    <main className="terminal-shell">
      <header className="terminal-header">
        <Link className="brand-row" to="/app">
          <div className="brand-mark small">G</div>
          <strong>GhostPay</strong>
          <span className="muted">/ Terminal</span>
        </Link>
        <div className="terminal-status">
          {offline ? (
            <>
              <WifiOff size={16} /> Offline mode
            </>
          ) : (
            <>
              <Wifi size={16} /> Network available
            </>
          )}
        </div>
      </header>
      <Link className="text-link" style={{ marginTop: 20 }} to="/app/terminals">
        <ArrowLeft size={14} /> Back to terminals
      </Link>
      {children}
    </main>
  );
}
