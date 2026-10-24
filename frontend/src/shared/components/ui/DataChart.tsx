import { lazy, Suspense } from "react";
import type { ApexOptions } from "apexcharts";

const Chart = lazy(async () => {
  await Promise.all([import("apexcharts/bar"), import("apexcharts/line")]);
  return import("react-apexcharts/core");
});

export function DataChart({
  type,
  series,
  options,
  description,
  height = 260,
}: {
  type: "line" | "bar";
  series: NonNullable<ApexOptions["series"]>;
  options: ApexOptions;
  description: string;
  height?: number;
}) {
  const tokens = getComputedStyle(document.documentElement);
  const color = (name: string) => tokens.getPropertyValue(name).trim();
  const base: ApexOptions = {
    chart: {
      fontFamily: "Inter, sans-serif",
      foreColor: color("--text-secondary"),
      background: "transparent",
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: false },
      parentHeightOffset: 0,
    },
    colors: [color("--accent")],
    fill: { type: "solid", opacity: 1 },
    dataLabels: { enabled: false },
    grid: { borderColor: color("--border"), strokeDashArray: 4 },
    legend: { show: false },
    ...options,
    tooltip: { theme: "light", ...options.tooltip },
  };
  return (
    <div className="data-chart" role="img" aria-label={description}>
      <div aria-hidden="true">
        <Suspense
          fallback={
            <div className="chart-loading" style={{ height }}>
              Loading chart…
            </div>
          }
        >
          <Chart
            type={type}
            series={series}
            options={base}
            height={height}
            width="100%"
          />
        </Suspense>
      </div>
    </div>
  );
}
