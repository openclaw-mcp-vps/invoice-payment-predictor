import type { PredictionDashboardData } from "@/lib/prediction-engine";
import { formatCurrency, formatDateLabel } from "@/lib/formatters";
import { PaymentChart } from "@/components/PaymentChart";
import { RiskScore } from "@/components/RiskScore";

interface PredictionDashboardProps {
  data: PredictionDashboardData;
}

export function PredictionDashboard({ data }: PredictionDashboardProps) {
  const { summary, predictions, chartData } = data;

  return (
    <div className="space-y-8">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs uppercase tracking-widest text-slate-400">Open Invoices</p>
          <p className="mt-2 text-2xl font-semibold text-slate-50">{summary.openInvoices}</p>
          <p className="mt-1 text-sm text-slate-300">{formatCurrency(summary.totalOpenAmountCents)}</p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs uppercase tracking-widest text-slate-400">Expected Late Cash</p>
          <p className="mt-2 text-2xl font-semibold text-orange-300">{formatCurrency(summary.expectedLateCashCents)}</p>
          <p className="mt-1 text-sm text-slate-300">Weighted by risk probability</p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs uppercase tracking-widest text-slate-400">High-Risk Exposure</p>
          <p className="mt-2 text-2xl font-semibold text-rose-300">{formatCurrency(summary.highRiskExposureCents)}</p>
          <p className="mt-1 text-sm text-slate-300">{summary.highRiskCount} invoices need intervention</p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs uppercase tracking-widest text-slate-400">Average Risk Score</p>
          <p className="mt-2 text-2xl font-semibold text-cyan-300">{summary.averageRiskScore}%</p>
          <p className="mt-1 text-sm text-slate-300">
            {summary.lowRiskCount} low / {summary.mediumRiskCount} medium / {summary.highRiskCount} high
          </p>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 sm:p-6">
        <h2 className="text-xl font-semibold text-slate-50">Client Payment Pattern Snapshot</h2>
        <p className="mt-1 text-sm text-slate-300">
          Compare how often clients pay on time versus late to prioritize outreach.
        </p>
        <div className="mt-4">
          <PaymentChart data={chartData} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 sm:p-6">
        <h2 className="text-xl font-semibold text-slate-50">Highest-Risk Invoices</h2>
        <p className="mt-1 text-sm text-slate-300">Focus on these first to protect near-term cash flow.</p>

        {predictions.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-5 text-sm text-slate-400">
            No open invoices yet. Add unpaid invoices in the Invoices page to generate predictions.
          </div>
        ) : (
          <div className="mt-4 grid gap-3">
            {predictions.slice(0, 6).map((prediction) => (
              <article
                key={prediction.invoiceId}
                className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 transition hover:border-slate-600"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-slate-100">{prediction.clientName}</p>
                    <p className="mono mt-1 text-xs text-slate-400">
                      Due {formatDateLabel(prediction.dueDate)} · {formatCurrency(prediction.amountCents, prediction.currency)}
                    </p>
                  </div>
                  <p className="rounded-full border border-slate-700 px-2 py-1 text-xs text-slate-300">
                    {prediction.daysPastDue > 0
                      ? `${prediction.daysPastDue} days overdue`
                      : `${prediction.daysUntilDue} days until due`}
                  </p>
                </div>

                <div className="mt-3">
                  <RiskScore score={prediction.riskScore} />
                </div>

                <p className="mt-3 text-sm text-slate-200">{prediction.recommendedAction}</p>

                <ul className="mt-3 space-y-1 text-xs text-slate-400">
                  {prediction.drivers.map((driver) => (
                    <li key={driver}>• {driver}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
