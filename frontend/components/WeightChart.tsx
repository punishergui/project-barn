"use client";

import { format } from "date-fns";
import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface WeightEntry {
  logged_at: string;
  weight_lbs: number;
  target_weight_lbs?: number;
}

interface WeightChartProps {
  entries: WeightEntry[];
  targetWeight?: number;
}

export default function WeightChart({ entries, targetWeight }: WeightChartProps) {
  if (entries.length === 0) {
    return null;
  }

  const chartData = [...entries]
    .sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime())
    .map((entry) => ({
      logged_at: entry.logged_at,
      date_label: format(new Date(entry.logged_at), "MMM d"),
      weight_lbs: entry.weight_lbs
    }));

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <XAxis dataKey="date_label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#78716c" }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#78716c" }} domain={["auto", "auto"]} />
          <Tooltip
            formatter={(value: number) => [`${value} lbs`, "Weight"]}
            labelFormatter={(_, payload) => {
              const raw = payload?.[0]?.payload?.logged_at;
              return raw ? format(new Date(raw), "MMM d, yyyy") : "";
            }}
            contentStyle={{ borderRadius: "0.75rem", border: "1px solid #e7e0d8" }}
          />
          {targetWeight ? (
            <ReferenceLine
              y={targetWeight}
              stroke="#d97706"
              strokeDasharray="4 4"
              label={{ value: "Target", fill: "#78716c", fontSize: 11 }}
            />
          ) : null}
          <Line type="monotone" dataKey="weight_lbs" stroke="#b45309" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
