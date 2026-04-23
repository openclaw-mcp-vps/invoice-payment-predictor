import { Readable } from "node:stream";
import csvParser from "csv-parser";
import { NextRequest, NextResponse } from "next/server";
import { bulkCreateInvoices } from "@/lib/db";
import { getAccessEmailFromCookieHeader } from "@/lib/paywall";
import type { InvoiceInput, InvoiceStatus } from "@/lib/types";

function normalizeHeader(header: string) {
  return header.trim().toLowerCase().replace(/\s+/g, "_");
}

function parseStatus(value: string | undefined): InvoiceStatus {
  if (!value) {
    return "UNPAID";
  }

  const normalized = value.trim().toLowerCase();
  if (["paid", "complete", "completed", "settled"].includes(normalized)) {
    return "PAID";
  }

  return "UNPAID";
}

function parseAmount(value: string | undefined) {
  if (!value) {
    return 0;
  }

  const cleaned = value.replace(/[^0-9.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const email = getAccessEmailFromCookieHeader(request.headers.get("cookie"));
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "CSV file is required." }, { status: 400 });
    }

    const content = await file.text();

    const rows: Record<string, string>[] = await new Promise((resolve, reject) => {
      const parsedRows: Record<string, string>[] = [];

      Readable.from(Buffer.from(content, "utf-8"))
        .pipe(csvParser({ mapHeaders: ({ header }) => normalizeHeader(header) }))
        .on("data", (row) => parsedRows.push(row as Record<string, string>))
        .on("error", reject)
        .on("end", () => resolve(parsedRows));
    });

    if (rows.length === 0) {
      return NextResponse.json({ error: "CSV file is empty or missing headers." }, { status: 400 });
    }

    const invoiceInputs: InvoiceInput[] = [];

    for (const row of rows) {
      const clientName = row.client_name || row.client || row.customer_name || "";
      const issueDate = row.issue_date || row.issued_on || row.invoice_date || "";
      const dueDate = row.due_date || row.due_on || "";
      const paidDate = row.paid_date || row.paid_on || null;
      const amount = parseAmount(row.amount || row.invoice_amount || row.total);

      if (!clientName || !issueDate || !dueDate || amount <= 0) {
        continue;
      }

      invoiceInputs.push({
        clientName,
        clientEmail: row.client_email || row.email || null,
        issueDate,
        dueDate,
        paidDate,
        amountCents: Math.round(amount * 100),
        currency: (row.currency || "USD").toUpperCase().slice(0, 3),
        status: parseStatus(row.status),
        notes: row.notes || null
      });
    }

    if (invoiceInputs.length === 0) {
      return NextResponse.json(
        {
          error:
            "No valid rows found. Required CSV columns: client_name, issue_date, due_date, amount. Optional: client_email, paid_date, currency, status, notes."
        },
        { status: 400 }
      );
    }

    const imported = await bulkCreateInvoices(invoiceInputs);

    return NextResponse.json({
      imported,
      message: `Imported ${imported} invoices successfully.`
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "CSV upload failed."
      },
      { status: 500 }
    );
  }
}
