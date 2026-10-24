import { ChartNoAxesColumn } from "lucide-react";
import { useState } from "react";
import { ChartPanel } from "../../../shared/components/ui/ChartPanel";
import type { Payment } from "../../../shared/types/api";
import { DataChart } from "../../../shared/components/ui/DataChart";
import { money } from "../../../shared/lib/format";
import { dailyVolume } from "../lib/chartData";

export function PaymentVolume({ payments }: { payments?: Payment[] }) {
  const [selectedCurrency, setCurrency] = useState("");
  const [limit, setLimit] = useState(14);
  const currencies = [
    ...new Set(
      payments?.filter((p) => p.status === "ACCEPTED").map((p) => p.currency),
    ),
  ].sort();
  const currency = currencies.includes(selectedCurrency)
    ? selectedCurrency
    : (currencies[0] ?? "MYR");
  const days = dailyVolume(payments ?? [], currency, limit);
  const formatDay = (day: string) =>
    new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(new Date(day));
  return (
    <ChartPanel>
      <div className="section-heading">
        <div>
          <h2 className="icon-heading">
            <ChartNoAxesColumn size={18} />
            Payment volume
          </h2>
          <p className="muted">Accepted payments by recorded day · UTC</p>
        </div>
        <div className="chart-controls">
          {currencies.length > 1 && (
            <select
              aria-label="Chart currency"
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
            >
              {currencies.map((code) => (
                <option key={code}>{code}</option>
              ))}
            </select>
          )}
          <select
            aria-label="Chart history"
            value={limit}
            onChange={(event) => setLimit(Number(event.target.value))}
          >
            <option value={7}>7 recorded days</option>
            <option value={14}>14 recorded days</option>
            <option value={30}>30 recorded days</option>
          </select>
        </div>
      </div>
      {days.length >= 2 ? (
        <>
          <div className="chart-total">
            <strong>
              {money(
                days.reduce((total, day) => total + day.amountMinor, 0),
                currency,
              )}
            </strong>
            <span>
              {days.length} recorded days · {currency}
            </span>
          </div>
          <DataChart
            type="line"
            series={[
              {
                name: `Accepted volume (${currency})`,
                data: days.map((day) => day.amountMinor / 100),
              },
            ]}
            description={days
              .map((day) => `${day.day}: ${money(day.amountMinor, currency)}`)
              .join("; ")}
            options={{
              stroke: { width: 3, curve: "straight", lineCap: "round" },
              markers: { size: 4, strokeWidth: 2, hover: { size: 6 } },
              xaxis: {
                categories: days.map((day) => day.day),
                axisTicks: { show: false },
                axisBorder: { show: false },
                labels: {
                  rotate: -35,
                  hideOverlappingLabels: true,
                  formatter: formatDay,
                },
              },
              yaxis: {
                min: 0,
                labels: {
                  formatter: (value) =>
                    new Intl.NumberFormat("en", {
                      notation: "compact",
                      maximumFractionDigits: 1,
                    }).format(value),
                },
                title: { text: currency },
              },
              tooltip: {
                y: {
                  formatter: (value) =>
                    money(Math.round((value ?? 0) * 100), currency),
                },
              },
            }}
          />
          <details className="chart-data">
            <summary>View volume data</summary>
            <div className="table-wrap">
              <table aria-label="Daily payment volume">
                <thead>
                  <tr>
                    <th>Date (UTC)</th>
                    <th className="numeric">Accepted volume</th>
                  </tr>
                </thead>
                <tbody>
                  {days.map((day) => (
                    <tr key={day.day}>
                      <td>{day.day}</td>
                      <td className="numeric">
                        {money(day.amountMinor, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      ) : (
        <div className="chart-empty">
          {payments === undefined
            ? "Select a merchant and wait for payment history to load."
            : "The volume chart will appear when accepted payments span at least two days in this currency."}
        </div>
      )}
    </ChartPanel>
  );
}
