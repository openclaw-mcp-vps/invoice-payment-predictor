"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { PaymentPatternChartDatum } from "@/lib/prediction-engine";

interface PaymentChartProps {
  data: PaymentPatternChartDatum[];
}

export function PaymentChart({ data }: PaymentChartProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/70 p-6 text-sm text-slate-400">
        Add invoices to see client payment behavior trends.
      </div>
    );
  }

  return (
    <div className="h-80 w-full rounded-xl border border-slate-800 bg-slate-900/70 p-3">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 20, left: 0, bottom: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="client" stroke="#94a3b8" fontSize={12} />
          <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: "#1e293b" }}
            contentStyle={{
              backgroundColor: "#020617",
              borderColor: "#334155",
              borderRadius: "12px"
            }}
          />
          <Legend />
          <Bar dataKey="onTime" stackId="a" fill="#22c55e" name="Paid On Time" />
          <Bar dataKey="late" stackId="a" fill="#fb923c" name="Paid Late" />
          <Bar dataKey="open" stackId="a" fill="#38bdf8" name="Still Open" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
