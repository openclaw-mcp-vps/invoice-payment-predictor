import type { Metadata } from "next";
import { PredictionDashboard } from "@/components/PredictionDashboard";
import { ProtectedNav } from "@/components/ProtectedNav";
import { requirePaidAccess } from "@/lib/access";
import { listInvoices } from "@/lib/db";
import { generatePredictions } from "@/lib/prediction-engine";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Monitor invoice late-payment risk and prioritize collection actions."
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const email = await requirePaidAccess();
  const invoices = await listInvoices();
  const predictionData = generatePredictions(invoices);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-5 pb-16 pt-8 sm:px-8">
      <ProtectedNav email={email} />

      <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 sm:p-6">
        <h1 className="text-2xl font-semibold text-slate-50">Cash Flow Risk Dashboard</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">
          This view surfaces which open invoices are most likely to be paid late based on historical behavior, amount
          patterns, and due-date timing.
        </p>
      </section>

      <PredictionDashboard data={predictionData} />
    </main>
  );
}
