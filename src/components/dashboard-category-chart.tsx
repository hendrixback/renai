"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
} from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

type CategoryDatum = {
  id: string
  name: string
  count: number
  tons: number
}

const config = {
  count: {
    label: "Flows",
    color: "var(--chart-1)",
  },
  tons: {
    label: "t/mo",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

export function CategoryBarChart({ data }: { data: CategoryDatum[] }) {
  return (
    <ChartContainer
      config={config}
      className="aspect-auto h-[280px] w-full"
    >
      <BarChart
        data={data}
        layout="vertical"
        margin={{ left: 8, right: 24, top: 8, bottom: 8 }}
      >
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          tickLine={false}
          axisLine={false}
          width={120}
          tick={{ fontSize: 12 }}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Bar
          dataKey="count"
          fill="var(--color-count)"
          radius={[0, 6, 6, 0]}
          barSize={22}
        >
          <LabelList
            dataKey="count"
            position="right"
            className="fill-foreground"
            fontSize={12}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
