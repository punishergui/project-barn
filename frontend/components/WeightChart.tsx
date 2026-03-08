"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { WeightEntry } from "@/lib/api";

type WeightChartProps = {
  weights: WeightEntry[];
  targetWeight: number | null;
};

export default function WeightChart({ weights, targetWeight }: WeightChartProps) {
  if (weights.length < 2) {
    return null;
  }

  const chartData = [...weights]
    .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
    .map((w) => ({
      date: new Date(w.recorded_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      weight: w.weight_lbs
    }));

  return (
    <div className="mt-2 h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e0d8" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#78716c" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#78716c" }}
            tickLine={false}
            axisLine={false}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{
              background: "#ffffff",
              border: "1px solid #e7e0d8",
              borderRadius: "0.75rem",
              fontSize: 12
            }}
            formatter={(value: number) => [`${value} lbs`, "Weight"]}
          />
          {targetWeight ? (
            <ReferenceLine
              y={targetWeight}
              stroke="#b45309"
              strokeDasharray="4 4"
              label={{
                value: `Target ${targetWeight} lbs`,
                position: "insideTopRight",
                fontSize: 10,
                fill: "#b45309"
              }}
            />
          ) : null}
          <Line
            type="monotone"
            dataKey="weight"
            stroke="#b45309"
            strokeWidth={2}
            dot={{ fill: "#b45309", r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
