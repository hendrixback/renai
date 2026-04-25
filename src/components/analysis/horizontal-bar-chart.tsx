"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
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
  value: { label: "Value", color: "var(--chart-1)" },
} satisfies ChartConfig;

type Datum = { key: string; label: string; value: number };

export function HorizontalBarChart({
  data,
  unitLabel = "t",
  emptyLabel = "No data",
  fractionDigits = 1,
}: {
  data: ReadonlyArray<Datum>;
  unitLabel?: string;
  emptyLabel?: string;
  fractionDigits?: number;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  const display = data.map((d) => ({
    key: d.key,
    label: d.label,
    value: d.value,
  }));

  return (
    <ChartContainer config={config} className="aspect-auto h-[260px] w-full">
      <BarChart
        data={display as { key: string; label: string; value: number }[]}
        layout="vertical"
        margin={{ left: 8, right: 28, top: 8, bottom: 8 }}
      >
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          tickLine={false}
          axisLine={false}
          width={140}
          tick={{ fontSize: 11 }}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(value) =>
                `${Number(value).toFixed(fractionDigits)} ${unitLabel}`
              }
            />
          }
        />
        <Bar
          dataKey="value"
          fill="var(--color-value)"
          radius={[0, 6, 6, 0]}
          barSize={20}
        >
          <LabelList
            dataKey="value"
            position="right"
            className="fill-foreground"
            fontSize={11}
            formatter={(value: unknown) =>
              `${Number(value).toFixed(fractionDigits)}`
            }
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
