"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const config = {
  total: { label: "Total tCO₂e", color: "var(--chart-1)" },
  prior: { label: "Prior year", color: "var(--chart-3)" },
} satisfies ChartConfig;

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

type Datum = {
  monthLabel: string;
  total: number;
  prior?: number;
};

export function EmissionsTrendChart({
  monthly,
  monthlyPrior,
}: {
  monthly: Array<{ month: number; total: number }>;
  monthlyPrior?: Array<{ month: number; total: number }> | null;
}) {
  // Convert kgCO₂e → tCO₂e for display.
  const data: Datum[] = monthly.map((m, i) => ({
    monthLabel: MONTH_LABELS[i],
    total: m.total / 1000,
    prior: monthlyPrior ? monthlyPrior[i].total / 1000 : undefined,
  }));

  return (
    <ChartContainer config={config} className="aspect-auto h-[280px] w-full">
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
        <defs>
          <linearGradient id="totalFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-total)" stopOpacity={0.4} />
            <stop offset="95%" stopColor="var(--color-total)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="monthLabel"
          tickLine={false}
          axisLine={false}
          tickMargin={6}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={48}
          tick={{ fontSize: 11 }}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              formatter={(value, _name, item) => [
                `${Number(value).toFixed(1)} tCO₂e`,
                item.dataKey === "prior" ? "Prior year" : "Current year",
              ]}
            />
          }
        />
        <Area
          type="monotone"
          dataKey="total"
          stroke="var(--color-total)"
          fill="url(#totalFill)"
          strokeWidth={2}
        />
        {monthlyPrior ? (
          <Line
            type="monotone"
            dataKey="prior"
            stroke="var(--color-prior)"
            strokeDasharray="4 4"
            strokeWidth={2}
            dot={false}
          />
        ) : null}
        {monthlyPrior ? <Legend /> : null}
      </AreaChart>
    </ChartContainer>
  );
}
