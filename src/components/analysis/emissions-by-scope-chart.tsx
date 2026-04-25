"use client";

import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const config = {
  s1: { label: "Scope 1", color: "var(--chart-1)" },
  s2: { label: "Scope 2", color: "var(--chart-2)" },
  s3: { label: "Scope 3", color: "var(--chart-3)" },
  waste: { label: "Waste", color: "var(--chart-4)" },
} satisfies ChartConfig;

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

type StackKey = "s1" | "s2" | "s3" | "waste";

export function EmissionsByScopeChart({
  monthly,
  visibleScopes,
}: {
  monthly: Array<{
    month: number;
    s1: number;
    s2: number;
    s3: number;
    waste: number;
  }>;
  visibleScopes: ReadonlyArray<StackKey>;
}) {
  const data = monthly.map((m, i) => ({
    monthLabel: MONTH_LABELS[i],
    s1: m.s1 / 1000,
    s2: m.s2 / 1000,
    s3: m.s3 / 1000,
    waste: m.waste / 1000,
  }));

  return (
    <ChartContainer config={config} className="aspect-auto h-[280px] w-full">
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
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
              formatter={(value, name) => [
                `${Number(value).toFixed(1)} tCO₂e`,
                String(name),
              ]}
            />
          }
        />
        <Legend />
        {visibleScopes.map((scope) => (
          <Bar
            key={scope}
            dataKey={scope}
            stackId="emissions"
            fill={`var(--color-${scope})`}
            name={config[scope].label as string}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
