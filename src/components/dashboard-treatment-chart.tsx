"use client"

import { Cell, Pie, PieChart } from "recharts"

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

type TreatmentDatum = { key: string; label: string; count: number }

const config = {
  recovery: { label: "Recovery", color: "var(--chart-1)" },
  disposal: { label: "Disposal", color: "var(--chart-4)" },
  untreated: { label: "Not assigned", color: "var(--muted-foreground)" },
} satisfies ChartConfig

export function TreatmentDonutChart({ data }: { data: TreatmentDatum[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0)

  return (
    <ChartContainer
      config={config}
      className="aspect-auto h-[260px] w-full"
    >
      <PieChart>
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
        <Pie
          data={data}
          dataKey="count"
          nameKey="label"
          innerRadius={60}
          outerRadius={90}
          strokeWidth={2}
        >
          {data.map((entry) => (
            <Cell
              key={entry.key}
              fill={`var(--color-${entry.key})`}
            />
          ))}
        </Pie>
        <ChartLegend
          content={<ChartLegendContent nameKey="label" />}
        />
        {total > 0 ? (
          <text
            x="50%"
            y="48%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-foreground text-xl font-semibold"
          >
            {total}
          </text>
        ) : null}
        <text
          x="50%"
          y="58%"
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-muted-foreground text-xs"
        >
          flows
        </text>
      </PieChart>
    </ChartContainer>
  )
}
