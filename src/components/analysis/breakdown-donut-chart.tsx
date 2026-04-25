"use client";

import { Cell, Pie, PieChart } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

// 8 chart-vars exist in tokens; cycle through them to colour an arbitrary
// number of slices (fuel types or Scope 3 categories vary by tenant).
const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-1)",
  "var(--chart-2)",
];

type Datum = {
  key: string;
  label: string;
  value: number;
};

export function BreakdownDonutChart({
  data,
  emptyLabel = "No data",
  unitLabel = "tCO₂e",
  divisor = 1000,
}: {
  data: ReadonlyArray<Datum>;
  emptyLabel?: string;
  unitLabel?: string;
  /** Divide raw values by this for display. 1000 = kg→tCO₂e, 1 = pass-through. */
  divisor?: number;
}) {
  const config: ChartConfig = Object.fromEntries(
    data.map((d, i) => [
      d.key,
      { label: d.label, color: PALETTE[i % PALETTE.length] },
    ]),
  );

  const total = data.reduce((sum, d) => sum + d.value, 0) / divisor;
  const display = data.map((d) => ({
    key: d.key,
    label: d.label,
    value: d.value / divisor,
  }));

  if (data.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  return (
    <ChartContainer config={config} className="aspect-auto h-[260px] w-full">
      <PieChart>
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(value, name) => [
                `${Number(value).toFixed(2)} ${unitLabel}`,
                String(name),
              ]}
            />
          }
        />
        <Pie
          data={display as { key: string; label: string; value: number }[]}
          dataKey="value"
          nameKey="label"
          innerRadius={60}
          outerRadius={90}
          strokeWidth={2}
        >
          {display.map((d, i) => (
            <Cell key={d.key} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <ChartLegend content={<ChartLegendContent nameKey="label" />} />
        <text
          x="50%"
          y="48%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-foreground text-xl font-semibold"
        >
          {total.toFixed(1)}
        </text>
        <text
          x="50%"
          y="58%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-muted-foreground text-xs"
        >
          {unitLabel}
        </text>
      </PieChart>
    </ChartContainer>
  );
}
