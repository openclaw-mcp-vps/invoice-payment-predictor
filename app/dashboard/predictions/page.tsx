import { listInvoices } from "@/lib/database";
import { generatePredictions, summarizePredictions } from "@/lib/prediction-engine";
import { requireAccessUser } from "@/lib/server-paywall";
import { PredictionCard } from "@/components/prediction-card";

function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(cents / 100);
}

export default async function PredictionsPage() {
  const user = await requireAccessUser();
  const invoices = await listInvoices(user.email);
  const predictions = generatePredictions(invoices);
  const summary = summarizePredictions(invoices, predictions);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-[#101721] p-6">
        <h1 className="text-2xl font-bold text-slate-100">Predictions</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">
          Focus your outreach on high-risk invoices first. The model combines client behavior, amount profile,
          weekday timing, and current aging to estimate delay probability.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-amber-500/25 bg-[#1a1710] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-300">At-Risk Invoices</p>
          <p className="mt-2 text-3xl font-bold text-amber-200">{summary.atRiskInvoices}</p>
        </article>
        <article className="rounded-2xl border border-rose-500/25 bg-[#1b1114] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-rose-300">High-Risk Invoices</p>
          <p className="mt-2 text-3xl font-bold text-rose-200">{summary.highRiskInvoices}</p>
        </article>
        <article className="rounded-2xl border border-sky-500/25 bg-[#101826] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-sky-300">Revenue at Risk</p>
          <p className="mt-2 text-3xl font-bold text-sky-200">{money(summary.estimatedDelayedRevenueCents)}</p>
        </article>
      </section>

      {predictions.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-white/20 bg-[#101721] p-8 text-center text-slate-300">
          <p className="text-lg font-semibold text-slate-100">No open invoices to predict right now</p>
          <p className="mt-2 text-sm text-slate-400">
            Add invoices from the Invoices tab. Once an invoice is open or overdue, risk predictions appear here.
          </p>
        </section>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {predictions.map((prediction) => (
            <PredictionCard key={prediction.invoiceId} prediction={prediction} />
          ))}
        </section>
      )}
    </div>
  );
}
