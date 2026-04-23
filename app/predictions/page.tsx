import type { Metadata } from "next";
import { ProtectedNav } from "@/components/ProtectedNav";
import { RiskScore } from "@/components/RiskScore";
import { requirePaidAccess } from "@/lib/access";
import { listInvoices } from "@/lib/db";
import { formatCurrency, formatDateLabel } from "@/lib/formatters";
import { generatePredictions } from "@/lib/prediction-engine";

export const metadata: Metadata = {
  title: "Predictions",
  description: "View detailed invoice late-payment predictions and recommended actions."
};

export const dynamic = "force-dynamic";

export default async function PredictionsPage() {
  const email = await requirePaidAccess();
  const invoices = await listInvoices();
  const { predictions } = generatePredictions(invoices);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-5 pb-16 pt-8 sm:px-8">
      <ProtectedNav email={email} />

      <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 sm:p-6">
        <h1 className="text-2xl font-semibold text-slate-50">Late-Payment Predictions</h1>
        <p className="mt-2 text-sm text-slate-300">
          Every open invoice is scored from 0-100. Prioritize the highest-risk invoices first to protect monthly cash
          inflow.
        </p>
      </section>

      <section className="space-y-3">
        {predictions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-5 text-sm text-slate-400">
            No open invoices to score. Add unpaid invoices from the Invoices page.
          </div>
        ) : (
          predictions.map((prediction) => (
            <article key={prediction.invoiceId} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-slate-100">{prediction.clientName}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {formatCurrency(prediction.amountCents, prediction.currency)} · Due {formatDateLabel(prediction.dueDate)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{prediction.clientEmail || "No client email on file"}</p>
                </div>
                <div className="min-w-48 max-w-56 flex-1">
                  <RiskScore score={prediction.riskScore} />
                </div>
              </div>

              <p className="mt-3 text-sm text-slate-200">{prediction.recommendedAction}</p>

              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-slate-700 px-2 py-1 text-slate-300">
                  {prediction.daysPastDue > 0
                    ? `${prediction.daysPastDue} days overdue`
                    : `${prediction.daysUntilDue} days until due`}
                </span>
                <span className="rounded-full border border-slate-700 px-2 py-1 text-slate-300">
                  Priority: {prediction.actionPriority.replace("_", " ")}
                </span>
              </div>

              <ul className="mt-3 space-y-1 text-xs text-slate-400">
                {prediction.drivers.map((driver) => (
                  <li key={driver}>• {driver}</li>
                ))}
              </ul>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
