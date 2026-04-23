import { differenceInCalendarDays, format, parseISO } from "date-fns";

import type { InvoiceRecord } from "@/lib/database";

interface InvoiceTableProps {
  invoices: InvoiceRecord[];
}

function formatMoney(amountCents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(amountCents / 100);
}

function statusBadge(status: InvoiceRecord["status"], dueAt: string, paidAt: string | null) {
  if (paidAt) {
    return "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40";
  }

  const overdueDays = differenceInCalendarDays(new Date(), parseISO(dueAt));
  if (overdueDays > 0 || status === "overdue") {
    return "bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/40";
  }

  return "bg-sky-500/20 text-sky-300 ring-1 ring-sky-500/40";
}

function statusText(status: InvoiceRecord["status"], dueAt: string, paidAt: string | null) {
  if (paidAt) {
    return "Paid";
  }

  const overdueDays = differenceInCalendarDays(new Date(), parseISO(dueAt));
  if (overdueDays > 0 || status === "overdue") {
    return `Overdue by ${overdueDays}d`;
  }

  return "Open";
}

export function InvoiceTable({ invoices }: InvoiceTableProps) {
  if (invoices.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/20 bg-[#101721] p-8 text-center text-slate-300">
        <p className="text-lg font-semibold text-slate-100">No invoices yet</p>
        <p className="mt-2 text-sm text-slate-400">
          Add invoices manually, import CSV, or sync QuickBooks/FreshBooks to generate predictions.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111925] shadow-lg shadow-black/30">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10 text-left text-sm">
          <thead className="bg-[#0f1621] text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Issued</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Paid</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-slate-200">
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-white/[0.03]">
                <td className="px-4 py-3 font-medium text-slate-100">{invoice.clientName}</td>
                <td className="px-4 py-3">{formatMoney(invoice.amountCents, invoice.currency)}</td>
                <td className="px-4 py-3">{format(parseISO(invoice.issuedAt), "MMM d, yyyy")}</td>
                <td className="px-4 py-3">{format(parseISO(invoice.dueAt), "MMM d, yyyy")}</td>
                <td className="px-4 py-3">
                  {invoice.paidAt ? format(parseISO(invoice.paidAt), "MMM d, yyyy") : "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusBadge(
                      invoice.status,
                      invoice.dueAt,
                      invoice.paidAt
                    )}`}
                  >
                    {statusText(invoice.status, invoice.dueAt, invoice.paidAt)}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400">{invoice.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
