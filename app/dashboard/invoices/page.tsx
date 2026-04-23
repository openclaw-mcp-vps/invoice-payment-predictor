import { listInvoices } from "@/lib/database";
import { requireAccessUser } from "@/lib/server-paywall";
import { InvoiceTable } from "@/components/invoice-table";

export default async function InvoicesPage() {
  const user = await requireAccessUser();
  const invoices = await listInvoices(user.email);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-[#101721] p-6">
        <h1 className="text-2xl font-bold text-slate-100">Invoices</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">
          Add single invoices, import CSV exports, or seed realistic sample history to test the model.
        </p>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <form method="post" action="/api/invoices" className="space-y-4 rounded-2xl border border-white/10 bg-[#111925] p-5">
          <h2 className="text-lg font-semibold text-slate-100">Add Invoice Manually</h2>
          <input type="hidden" name="mode" value="single" />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm text-slate-300">
              Client Name
              <input
                required
                name="clientName"
                className="w-full rounded-lg border-white/15 bg-[#0d1420] text-slate-100"
                placeholder="Northline Medical"
              />
            </label>
            <label className="space-y-1 text-sm text-slate-300">
              Amount (USD)
              <input
                required
                name="amount"
                type="number"
                min="1"
                step="0.01"
                className="w-full rounded-lg border-white/15 bg-[#0d1420] text-slate-100"
                placeholder="2450"
              />
            </label>
            <label className="space-y-1 text-sm text-slate-300">
              Issued Date
              <input required name="issuedAt" type="date" className="w-full rounded-lg border-white/15 bg-[#0d1420] text-slate-100" />
            </label>
            <label className="space-y-1 text-sm text-slate-300">
              Due Date
              <input required name="dueAt" type="date" className="w-full rounded-lg border-white/15 bg-[#0d1420] text-slate-100" />
            </label>
            <label className="space-y-1 text-sm text-slate-300">
              Status
              <select name="status" className="w-full rounded-lg border-white/15 bg-[#0d1420] text-slate-100">
                <option value="open">Open</option>
                <option value="overdue">Overdue</option>
                <option value="paid">Paid</option>
              </select>
            </label>
            <label className="space-y-1 text-sm text-slate-300">
              Paid Date (if paid)
              <input name="paidAt" type="date" className="w-full rounded-lg border-white/15 bg-[#0d1420] text-slate-100" />
            </label>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
          >
            Save Invoice
          </button>
        </form>

        <div className="space-y-4 rounded-2xl border border-white/10 bg-[#111925] p-5">
          <h2 className="text-lg font-semibold text-slate-100">Import CSV or Seed Data</h2>
          <p className="text-sm text-slate-400">
            CSV columns: <span className="text-slate-300">client_name,amount,issued_at,due_at,paid_at,status,currency,external_id</span>
          </p>
          <form method="post" action="/api/invoices" className="space-y-3">
            <input type="hidden" name="mode" value="csv" />
            <label className="block space-y-1 text-sm text-slate-300">
              Paste CSV
              <textarea
                name="csv"
                rows={8}
                className="w-full rounded-lg border-white/15 bg-[#0d1420] font-mono text-xs text-slate-100"
                placeholder="client_name,amount,issued_at,due_at,paid_at,status\nBlue Harbor Studio,2200,2026-01-04,2026-02-03,2026-02-20,paid"
              />
            </label>
            <button
              type="submit"
              className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
            >
              Import CSV
            </button>
          </form>
          <form method="post" action="/api/invoices" className="pt-2">
            <input type="hidden" name="mode" value="seed" />
            <button
              type="submit"
              className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-sky-400/50"
            >
              Seed Sample History
            </button>
          </form>
        </div>
      </section>

      <InvoiceTable invoices={invoices} />
    </div>
  );
}
