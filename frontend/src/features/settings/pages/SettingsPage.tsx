import { LogOut } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { me } from "../../auth/auth";
import { auth } from "../../../shared/api/client";
import { Badge } from "../../../shared/components/ui/Badge";
import { Button } from "../../../shared/components/ui/Button";
import { Section } from "../../../shared/components/ui/Section";
import { ErrorState } from "../../../shared/components/ui/ErrorState";

export function SettingsPage() {
  const account = useQuery({ queryKey: ["me"], queryFn: me });
  const client = useQueryClient();
  const navigate = useNavigate();
  const logout = () => {
    auth.clear();
    client.clear();
    navigate("/login");
  };
  return (
    <div className="settings-stack">
      <Section>
        <h2>Account details</h2>
        <p className="muted">Your GhostPay workspace identity.</p>
        {account.error && <ErrorState message={account.error.message} />}
        <div className="settings-row">
          <span>Email address</span>
          <strong>{account.data?.email ?? "—"}</strong>
        </div>
        <div className="settings-row">
          <span>Account ID</span>
          <strong className="batch-id">{account.data?.id ?? "—"}</strong>
        </div>
      </Section>
      <Section>
        <h2>Application</h2>
        <p className="muted">Offline payment recording and synchronization.</p>
        <div className="settings-row">
          <span>Currency</span>
          <strong>MYR · Malaysian Ringgit</strong>
        </div>
        <div className="settings-row">
          <span>Local storage</span>
          <strong>IndexedDB · this device</strong>
        </div>
        <p className="hint">
          Locally recorded payments remain on this device after signing out.
        </p>
      </Section>
      <Section>
        <h2>Session</h2>
        <p className="muted">Access to your payment workspace.</p>
        <div className="settings-row">
          <span>Authentication</span>
          <Badge>JWT session</Badge>
        </div>
        <div className="settings-row">
          <span>End your current session</span>
          <Button secondary onClick={logout}>
            <LogOut size={15} /> Log out
          </Button>
        </div>
      </Section>
    </div>
  );
}
