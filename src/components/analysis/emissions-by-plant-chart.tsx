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

type StackKey = "s1" | "s2" | "s3" | "waste";

type SiteRow = {
  siteId: string | null;
  name: string;
  s1: number;
  s2: number;
  s3: number;
  waste: number;
  total: number;
};

export function EmissionsByPlantChart({
  bySite,
  visibleScopes,
}: {
  bySite: ReadonlyArray<SiteRow>;
  visibleScopes: ReadonlyArray<StackKey>;
}) {
  const data = bySite.map((row) => ({
    name: row.name,
    s1: row.s1 / 1000,
    s2: row.s2 / 1000,
    s3: row.s3 / 1000,
    waste: row.waste / 1000,
  }));

  return (
    <ChartContainer config={config} className="aspect-auto h-[280px] w-full">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 24, bottom: 0, left: 8 }}
      >
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis type="number" tickLine={false} axisLine={false} hide />
        <YAxis
          type="category"
          dataKey="name"
          tickLine={false}
          axisLine={false}
          width={120}
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
