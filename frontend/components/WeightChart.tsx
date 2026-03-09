"use client";

import { format } from "date-fns";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface WeightEntry {
  recorded_at: string;
  weight_lbs: number;
}

interface WeightChartProps {
  entries: WeightEntry[];
  targetWeight?: number;
}

export default function WeightChart({ entries, targetWeight }: WeightChartProps) {
  const data = entries.map((e) => ({
    date: format(new Date(e.recorded_at), "MMM d"),
    weight: e.weight_lbs
  }));

  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No weight entries yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e0d8" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#78716c" }} />
        <YAxis tick={{ fontSize: 11, fill: "#78716c" }} />
        <Tooltip
          contentStyle={{
            borderRadius: "0.75rem",
            border: "1px solid #e7e0d8",
            fontSize: 12
          }}
          formatter={(value: number) => [`${value} lbs`, "Weight"]}
        />
        <Line type="monotone" dataKey="weight" stroke="#b45309" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        {targetWeight !== undefined && (
          <ReferenceLine y={targetWeight} stroke="#d97706" strokeDasharray="4 4" label={{ value: "Target", fill: "#78716c", fontSize: 11 }} />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
