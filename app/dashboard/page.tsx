import Link from "next/link";

import { listInvoices } from "@/lib/database";
import { buildTimeline, generatePredictions, summarizePredictions } from "@/lib/prediction-engine";
import { requireAccessUser } from "@/lib/server-paywall";
import { PaymentTimeline } from "@/components/payment-timeline";
import { PredictionCard } from "@/components/prediction-card";

function currency(amountCents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(amountCents / 100);
}

export default async function DashboardOverviewPage() {
  const user = await requireAccessUser();
  const invoices = await listInvoices(user.email);
  const predictions = generatePredictions(invoices);
  const summary = summarizePredictions(invoices, predictions);
  const timeline = buildTimeline(invoices);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-[#101721] p-6">
        <h1 className="text-2xl font-bold text-slate-100">Cash Flow Risk Dashboard</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">
          This view highlights where late payments are most likely to hit your revenue in the next cycle.
          Prioritize high-risk invoices first to shorten collection lag.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-white/10 bg-[#111925] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Open Invoices</p>
          <p className="mt-2 text-3xl font-bold text-slate-100">{summary.totalOpenInvoices}</p>
        </article>
        <article className="rounded-2xl border border-amber-500/30 bg-[#1a1710] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-amber-300">At-Risk</p>
          <p className="mt-2 text-3xl font-bold text-amber-200">{summary.atRiskInvoices}</p>
        </article>
        <article className="rounded-2xl border border-rose-500/30 bg-[#1b1114] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-rose-300">High Risk</p>
          <p className="mt-2 text-3xl font-bold text-rose-200">{summary.highRiskInvoices}</p>
        </article>
        <article className="rounded-2xl border border-sky-500/30 bg-[#101826] p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-sky-300">Delayed Revenue</p>
          <p className="mt-2 text-3xl font-bold text-sky-200">{currency(summary.estimatedDelayedRevenueCents)}</p>
          <p className="mt-1 text-xs text-sky-300/80">Avg delay: {summary.averagePredictedDelayDays} days</p>
        </article>
      </section>

      <PaymentTimeline data={timeline} />

      <section className="rounded-2xl border border-white/10 bg-[#101721] p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-slate-100">Top Collection Priorities</h2>
          <Link
            href="/dashboard/predictions"
            className="rounded-lg border border-sky-400/40 px-3 py-1.5 text-sm font-medium text-sky-300 hover:border-sky-300"
          >
            View all predictions
          </Link>
        </div>

        {predictions.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-white/20 bg-[#0f1621] p-6 text-sm text-slate-300">
            You have no open invoices to score yet.
            <Link href="/dashboard/invoices" className="ml-1 font-semibold text-sky-300 underline-offset-2 hover:underline">
              Add invoice data
            </Link>
            to generate risk forecasts.
          </div>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {predictions.slice(0, 3).map((prediction) => (
              <PredictionCard key={prediction.invoiceId} prediction={prediction} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
