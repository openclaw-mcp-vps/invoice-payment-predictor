"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "manual" | "csv";

const today = new Date().toISOString().slice(0, 10);

export function InvoiceUpload() {
  const [mode, setMode] = useState<Mode>("manual");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [manualData, setManualData] = useState({
    clientName: "",
    clientEmail: "",
    issueDate: today,
    dueDate: today,
    paidDate: "",
    amount: "",
    currency: "USD",
    status: "UNPAID",
    notes: ""
  });

  const router = useRouter();

  const canSubmitManual = useMemo(() => {
    return (
      manualData.clientName.trim().length > 1 &&
      manualData.issueDate.length > 0 &&
      manualData.dueDate.length > 0 &&
      Number(manualData.amount) > 0
    );
  }, [manualData]);

  async function submitManualInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmitManual) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          clientName: manualData.clientName,
          clientEmail: manualData.clientEmail || null,
          issueDate: manualData.issueDate,
          dueDate: manualData.dueDate,
          paidDate: manualData.paidDate || null,
          amount: Number(manualData.amount),
          currency: manualData.currency,
          status: manualData.status,
          notes: manualData.notes || null
        })
      });

      const result = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(result.error || "Unable to save invoice.");
      }

      setMessage(result.message || "Invoice saved.");
      setManualData((current) => ({
        ...current,
        clientName: "",
        clientEmail: "",
        paidDate: "",
        amount: "",
        notes: ""
      }));
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to save invoice.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function uploadCsv(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("csv") as HTMLInputElement | null;
    const file = fileInput?.files?.[0];

    if (!file) {
      setError("Choose a CSV file before uploading.");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });

      const result = (await response.json()) as { error?: string; imported?: number; message?: string };

      if (!response.ok) {
        throw new Error(result.error || "CSV upload failed.");
      }

      setMessage(result.message || `Imported ${result.imported || 0} invoices from CSV.`);
      form.reset();
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "CSV upload failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-50">Add Invoice Data</h2>
          <p className="mt-1 text-sm text-slate-300">
            Ingest fresh billing data manually or upload a CSV export to improve predictions.
          </p>
        </div>
        <div className="inline-flex rounded-xl border border-slate-700 p-1 text-xs">
          <button
            onClick={() => setMode("manual")}
            className={`rounded-lg px-3 py-1.5 transition ${
              mode === "manual" ? "bg-slate-700 text-slate-100" : "text-slate-400 hover:text-slate-200"
            }`}
            type="button"
          >
            Manual Entry
          </button>
          <button
            onClick={() => setMode("csv")}
            className={`rounded-lg px-3 py-1.5 transition ${
              mode === "csv" ? "bg-slate-700 text-slate-100" : "text-slate-400 hover:text-slate-200"
            }`}
            type="button"
          >
            CSV Upload
          </button>
        </div>
      </div>

      {mode === "manual" ? (
        <form onSubmit={submitManualInvoice} className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-slate-300">
            Client Name
            <input
              value={manualData.clientName}
              onChange={(event) => setManualData((current) => ({ ...current, clientName: event.target.value }))}
              required
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-emerald-500"
            />
          </label>

          <label className="text-sm text-slate-300">
            Client Email
            <input
              type="email"
              value={manualData.clientEmail}
              onChange={(event) => setManualData((current) => ({ ...current, clientEmail: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-emerald-500"
            />
          </label>

          <label className="text-sm text-slate-300">
            Issue Date
            <input
              type="date"
              value={manualData.issueDate}
              onChange={(event) => setManualData((current) => ({ ...current, issueDate: event.target.value }))}
              required
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-emerald-500"
            />
          </label>

          <label className="text-sm text-slate-300">
            Due Date
            <input
              type="date"
              value={manualData.dueDate}
              onChange={(event) => setManualData((current) => ({ ...current, dueDate: event.target.value }))}
              required
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-emerald-500"
            />
          </label>

          <label className="text-sm text-slate-300">
            Paid Date
            <input
              type="date"
              value={manualData.paidDate}
              onChange={(event) => setManualData((current) => ({ ...current, paidDate: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-emerald-500"
            />
          </label>

          <label className="text-sm text-slate-300">
            Amount ({manualData.currency})
            <input
              type="number"
              min="0"
              step="0.01"
              value={manualData.amount}
              onChange={(event) => setManualData((current) => ({ ...current, amount: event.target.value }))}
              required
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-emerald-500"
            />
          </label>

          <label className="text-sm text-slate-300">
            Currency
            <input
              value={manualData.currency}
              onChange={(event) =>
                setManualData((current) => ({ ...current, currency: event.target.value.toUpperCase().slice(0, 3) }))
              }
              maxLength={3}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-emerald-500"
            />
          </label>

          <label className="text-sm text-slate-300">
            Status
            <select
              value={manualData.status}
              onChange={(event) => setManualData((current) => ({ ...current, status: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-emerald-500"
            >
              <option value="UNPAID">Unpaid</option>
              <option value="PAID">Paid</option>
            </select>
          </label>

          <label className="text-sm text-slate-300 sm:col-span-2">
            Notes
            <textarea
              value={manualData.notes}
              onChange={(event) => setManualData((current) => ({ ...current, notes: event.target.value }))}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-emerald-500"
              placeholder="Optional context: extension granted, dispute risk, net terms changed"
            />
          </label>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={!canSubmitManual || isSubmitting}
              className="rounded-lg bg-emerald-500 px-4 py-2.5 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              {isSubmitting ? "Saving..." : "Save Invoice"}
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={uploadCsv} className="mt-5 space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
            <p className="font-semibold text-slate-100">CSV columns supported:</p>
            <p className="mt-1 mono text-xs text-slate-400">
              client_name, client_email, issue_date, due_date, paid_date, amount, currency, status, notes
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Dates should be ISO format (YYYY-MM-DD). Amount should be in major currency units (e.g. 1250.00).
            </p>
          </div>
          <label className="block text-sm text-slate-300">
            CSV file
            <input
              type="file"
              name="csv"
              accept=".csv,text/csv"
              className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200 file:mr-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-slate-100"
            />
          </label>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-cyan-500 px-4 py-2.5 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            {isSubmitting ? "Uploading..." : "Upload CSV"}
          </button>
        </form>
      )}

      {(message || error) && (
        <p className={`mt-4 text-sm ${error ? "text-orange-300" : "text-emerald-300"}`}>{error || message}</p>
      )}
    </section>
  );
}
