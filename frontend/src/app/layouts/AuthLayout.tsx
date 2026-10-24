import type { ReactNode } from "react";
import { LockKeyhole } from "lucide-react";
import { Section } from "../../shared/components/ui/Section";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="auth-shell">
      <Section className="auth-card">{children}</Section>
      <p className="auth-footnote">
        <LockKeyhole
          size={11}
          style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }}
        />
        Offline-first. Built for continuity.
      </p>
    </main>
  );
}
