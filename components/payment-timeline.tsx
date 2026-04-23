"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import type { TimelinePoint } from "@/lib/prediction-engine";

interface PaymentTimelineProps {
  data: TimelinePoint[];
}

export function PaymentTimeline({ data }: PaymentTimelineProps) {
  return (
    <div className="h-[260px] w-full rounded-2xl border border-white/10 bg-[#111925] p-4 shadow-lg shadow-black/30">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-300">
        Delay Trend vs. On-Time Rate
      </h3>

      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={data}>
          <CartesianGrid stroke="rgba(148, 163, 184, 0.2)" vertical={false} />
          <XAxis dataKey="month" stroke="#94a3b8" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis
            yAxisId="delay"
            stroke="#f59e0b"
            tickLine={false}
            axisLine={false}
            width={32}
            fontSize={12}
          />
          <YAxis
            yAxisId="rate"
            orientation="right"
            stroke="#38bdf8"
            tickLine={false}
            axisLine={false}
            width={38}
            fontSize={12}
            domain={[0, 100]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              border: "1px solid rgba(148,163,184,0.3)",
              borderRadius: "0.75rem"
            }}
            labelStyle={{ color: "#e2e8f0" }}
            formatter={(value: number, key) => {
              if (key === "averageDelay") {
                return [`${value} days`, "Avg Delay"];
              }
              if (key === "onTimeRate") {
                return [`${value}%`, "On-Time Rate"];
              }
              return [value, key];
            }}
          />
          <Line
            yAxisId="delay"
            type="monotone"
            dataKey="averageDelay"
            stroke="#f59e0b"
            strokeWidth={2.5}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            name="Avg Delay"
          />
          <Line
            yAxisId="rate"
            type="monotone"
            dataKey="onTimeRate"
            stroke="#38bdf8"
            strokeWidth={2.5}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            name="On-Time Rate"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
