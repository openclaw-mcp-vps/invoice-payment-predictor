import { format, parseISO } from "date-fns";

import type { InvoicePrediction } from "@/lib/prediction-engine";
import { RiskScore } from "@/components/risk-score";

interface PredictionCardProps {
  prediction: InvoicePrediction;
}

function formatMoney(amountCents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(amountCents / 100);
}

export function PredictionCard({ prediction }: PredictionCardProps) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[#111925] p-5 shadow-lg shadow-black/30">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">Invoice #{prediction.invoiceId}</p>
          <h3 className="text-lg font-semibold text-slate-100">{prediction.clientName}</h3>
        </div>
        <RiskScore score={prediction.riskScore} />
      </div>

      <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Invoice Amount</p>
          <p className="mt-1 font-medium text-slate-100">{formatMoney(prediction.amountCents)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Due Date</p>
          <p className="mt-1 font-medium text-slate-100">
            {format(parseISO(prediction.dueAt), "MMM d, yyyy")}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Predicted Delay</p>
          <p className="mt-1 font-medium text-slate-100">{prediction.predictedDelayDays} days</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Model Confidence</p>
          <p className="mt-1 font-medium text-slate-100">{prediction.confidence}%</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-[#0d1420] p-3 text-sm text-slate-300">
        <p className="font-medium text-slate-200">Recommended action</p>
        <p className="mt-1">{prediction.action}</p>
        <p className="mt-2 text-xs text-slate-500">{prediction.reason}</p>
      </div>
    </article>
  );
}
