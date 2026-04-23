import type { Metadata } from "next";
import { InvoiceUpload } from "@/components/InvoiceUpload";
import { ProtectedNav } from "@/components/ProtectedNav";
import { requirePaidAccess } from "@/lib/access";
import { listInvoices } from "@/lib/db";
import { formatCurrency, formatDateLabel } from "@/lib/formatters";

export const metadata: Metadata = {
  title: "Invoices",
  description: "Manage invoice records through manual entry or CSV upload."
};

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const email = await requirePaidAccess();
  const invoices = await listInvoices();

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-5 pb-16 pt-8 sm:px-8">
      <ProtectedNav email={email} />
      <InvoiceUpload />

      <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-slate-50">Invoice Ledger</h1>
          <p className="text-xs text-slate-400">{invoices.length} invoices stored</p>
        </div>

        {invoices.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-400">
            No invoices yet. Add your first invoice to generate payment risk insights.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase tracking-widest text-slate-400">
                  <th className="px-3 py-2">Client</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Issued</th>
                  <th className="px-3 py-2">Due</th>
                  <th className="px-3 py-2">Paid</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-slate-800/70 text-slate-200">
                    <td className="px-3 py-3">
                      <p className="font-medium text-slate-100">{invoice.clientName}</p>
                      <p className="text-xs text-slate-400">{invoice.clientEmail || "No email"}</p>
                    </td>
                    <td className="px-3 py-3">{formatCurrency(invoice.amountCents, invoice.currency)}</td>
                    <td className="px-3 py-3">{formatDateLabel(invoice.issueDate)}</td>
                    <td className="px-3 py-3">{formatDateLabel(invoice.dueDate)}</td>
                    <td className="px-3 py-3">{invoice.paidDate ? formatDateLabel(invoice.paidDate) : "-"}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          invoice.status === "PAID"
                            ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                            : "border border-orange-500/40 bg-orange-500/15 text-orange-200"
                        }`}
                      >
                        {invoice.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
