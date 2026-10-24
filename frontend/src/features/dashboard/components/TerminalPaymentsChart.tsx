import { ChartPanel } from "../../../shared/components/ui/ChartPanel";
import type { Payment, Terminal } from "../../../shared/types/api";
import { DataChart } from "../../../shared/components/ui/DataChart";
import { terminalPaymentCounts } from "../lib/chartData";

export function TerminalPaymentsChart({
  payments,
  terminals,
}: {
  payments?: Payment[];
  terminals?: Terminal[];
}) {
  const counts = terminalPaymentCounts(payments ?? [], terminals ?? []);
  // Keep long terminal lists readable without dropping any terminals.
  const height = Math.max(220, counts.length * 42 + 70);
  return (
    <ChartPanel>
      <div className="section-heading">
        <div>
          <h2>Payments by terminal</h2>
          <p className="muted">
            Accepted payment count · all time · all currencies
          </p>
        </div>
      </div>
      {payments !== undefined &&
      counts.some((terminal) => terminal.count > 0) ? (
        <>
          <div className="terminal-chart-scroll">
            <DataChart
              type="bar"
              height={height}
              series={[
                {
                  name: "Accepted payments",
                  data: counts.map((terminal) => terminal.count),
                },
              ]}
              description={counts
                .map(
                  (terminal) =>
                    `${terminal.name}: ${terminal.count} accepted payments`,
                )
                .join("; ")}
              options={{
                plotOptions: {
                  bar: { horizontal: true, borderRadius: 4, barHeight: "45%" },
                },
                stroke: { width: 0 },
                xaxis: {
                  categories: counts.map((terminal) => terminal.name),
                  min: 0,
                  decimalsInFloat: 0,
                  labels: {
                    formatter: (value) =>
                      Number.isInteger(Number(value)) ? String(value) : "",
                  },
                  axisBorder: { show: false },
                  axisTicks: { show: false },
                },
                yaxis: { labels: { maxWidth: 130 } },
                tooltip: {
                  y: {
                    formatter: (value) =>
                      `${value} ${value === 1 ? "payment" : "payments"}`,
                  },
                },
              }}
            />
          </div>
          <details className="chart-data">
            <summary>View terminal counts</summary>
            <div className="table-wrap">
              <table aria-label="Terminal payment counts">
                <thead>
                  <tr>
                    <th>Terminal</th>
                    <th className="numeric">Accepted payments</th>
                  </tr>
                </thead>
                <tbody>
                  {counts.map((terminal) => (
                    <tr key={terminal.id}>
                      <td>{terminal.name}</td>
                      <td className="numeric">{terminal.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      ) : (
        <div className="chart-empty">
          No accepted payments to compare across terminals yet.
        </div>
      )}
    </ChartPanel>
  );
}
