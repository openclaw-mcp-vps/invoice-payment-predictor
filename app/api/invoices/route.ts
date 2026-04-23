import { Readable } from "node:stream";

import csvParser from "csv-parser";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAccessUserFromRequest } from "@/lib/access";
import { createInvoices, listInvoices, seedInvoices, type NewInvoiceInput } from "@/lib/database";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const statusSchema = z.enum(["open", "paid", "overdue", "void"]);

const invoiceSchema = z.object({
  clientName: z.string().min(2),
  amount: z.coerce.number().positive(),
  issuedAt: dateSchema,
  dueAt: dateSchema,
  paidAt: dateSchema.optional().nullable(),
  currency: z.string().min(3).max(3).optional().default("USD"),
  status: statusSchema.optional().default("open"),
  externalId: z.string().optional().nullable(),
  source: z.string().optional().default("manual")
});

function pickField(row: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    if (typeof row[key] === "string" && row[key].trim().length > 0) {
      return row[key].trim();
    }
  }
  return "";
}

function toInvoiceInput(parsed: z.infer<typeof invoiceSchema>): NewInvoiceInput {
  return {
    clientName: parsed.clientName,
    amountCents: Math.round(parsed.amount * 100),
    currency: parsed.currency.toUpperCase(),
    issuedAt: parsed.issuedAt,
    dueAt: parsed.dueAt,
    paidAt: parsed.paidAt ?? null,
    status: parsed.status,
    externalId: parsed.externalId ?? null,
    source: parsed.source
  };
}

async function parseCsvInvoices(csvText: string): Promise<NewInvoiceInput[]> {
  if (!csvText.trim()) {
    return [];
  }

  return new Promise((resolve, reject) => {
    const parsedInvoices: NewInvoiceInput[] = [];

    Readable.from([csvText])
      .pipe(
        csvParser({
          mapHeaders: ({ header }) => header.trim().toLowerCase()
        })
      )
      .on("data", (row: Record<string, string>) => {
        const clientName = pickField(row, ["client_name", "client", "clientname"]);
        const amountRaw = pickField(row, ["amount", "amount_usd", "invoice_amount"]);
        const issuedAt = pickField(row, ["issued_at", "issued", "invoice_date"]);
        const dueAt = pickField(row, ["due_at", "due_date", "due"]);
        const paidAt = pickField(row, ["paid_at", "paid_date"]);
        const status = pickField(row, ["status"]);
        const currency = pickField(row, ["currency"]) || "USD";
        const externalId = pickField(row, ["external_id", "invoice_id", "id"]);

        const amount = Number(amountRaw);
        if (!clientName || Number.isNaN(amount) || !issuedAt || !dueAt) {
          return;
        }

        parsedInvoices.push({
          clientName,
          amountCents: Math.round(amount * 100),
          issuedAt,
          dueAt,
          paidAt: paidAt || null,
          status: statusSchema.safeParse(status).success ? (status as NewInvoiceInput["status"]) : paidAt ? "paid" : "open",
          currency,
          externalId: externalId || null,
          source: "csv"
        });
      })
      .on("end", () => resolve(parsedInvoices))
      .on("error", reject);
  });
}

function wantsHtml(request: NextRequest) {
  return request.headers.get("accept")?.includes("text/html") ?? false;
}

function redirectWithResult(request: NextRequest, query: string) {
  return NextResponse.redirect(new URL(`/dashboard/invoices?${query}`, request.url));
}

export async function GET(request: NextRequest) {
  const user = getAccessUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const invoices = await listInvoices(user.email);
    return NextResponse.json({ invoices });
  } catch (error) {
    console.error("Failed to list invoices", error);
    return NextResponse.json({ error: "Failed to list invoices" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = getAccessUserFromRequest(request);
  if (!user) {
    if (wantsHtml(request)) {
      return NextResponse.redirect(new URL("/?paywall=locked", request.url));
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isHtmlRequest = wantsHtml(request);

  try {
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const payload = await request.json();

      if (payload?.mode === "seed" || payload?.seed === true) {
        const inserted = await seedInvoices(user.email);
        return NextResponse.json({ inserted });
      }

      if (typeof payload?.csv === "string") {
        const invoicesFromCsv = await parseCsvInvoices(payload.csv);
        const inserted = await createInvoices(user.email, invoicesFromCsv);
        return NextResponse.json({ inserted, parsed: invoicesFromCsv.length });
      }

      if (Array.isArray(payload?.invoices)) {
        const validated = payload.invoices.map((invoice: unknown) =>
          toInvoiceInput(invoiceSchema.parse(invoice))
        );
        const inserted = await createInvoices(user.email, validated);
        return NextResponse.json({ inserted });
      }

      const validated = toInvoiceInput(invoiceSchema.parse(payload));
      const inserted = await createInvoices(user.email, [validated]);
      return NextResponse.json({ inserted });
    }

    const formData = await request.formData();
    const mode = String(formData.get("mode") || "single");

    if (mode === "seed") {
      const inserted = await seedInvoices(user.email);
      if (isHtmlRequest) {
        return redirectWithResult(request, `seeded=${inserted}`);
      }
      return NextResponse.json({ inserted });
    }

    if (mode === "csv") {
      const csv = String(formData.get("csv") || "");
      const invoicesFromCsv = await parseCsvInvoices(csv);
      const inserted = await createInvoices(user.email, invoicesFromCsv);
      if (isHtmlRequest) {
        return redirectWithResult(request, `imported=${inserted}`);
      }
      return NextResponse.json({ inserted, parsed: invoicesFromCsv.length });
    }

    const parsed = invoiceSchema.parse({
      clientName: formData.get("clientName"),
      amount: formData.get("amount"),
      issuedAt: formData.get("issuedAt"),
      dueAt: formData.get("dueAt"),
      paidAt: formData.get("paidAt") || null,
      status: formData.get("status") || "open",
      currency: "USD",
      source: "manual"
    });

    const inserted = await createInvoices(user.email, [toInvoiceInput(parsed)]);

    if (isHtmlRequest) {
      return redirectWithResult(request, `created=${inserted}`);
    }

    return NextResponse.json({ inserted });
  } catch (error) {
    console.error("Failed to create invoice", error);

    if (isHtmlRequest) {
      return redirectWithResult(request, "error=invalid_input");
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.flatten() }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to process invoices" }, { status: 500 });
  }
}
