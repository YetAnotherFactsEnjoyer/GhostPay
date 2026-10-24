import { lazy, Suspense, type ReactNode } from "react";

const Card = lazy(async () => ({
  default: (await import("@material-tailwind/react/components/Card")).Card,
}));

export function ChartPanel({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <section className="analytics-card chart-loading">
          Loading analytics…
        </section>
      }
    >
      <Card
        shadow={false}
        className="analytics-card"
        // Material Tailwind 2's generated types require these optional DOM props.
        placeholder={undefined}
        onResize={undefined}
        onResizeCapture={undefined}
        onPointerEnterCapture={undefined}
        onPointerLeaveCapture={undefined}
      >
        {children}
      </Card>
    </Suspense>
  );
}
