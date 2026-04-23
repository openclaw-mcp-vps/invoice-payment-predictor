import { isBefore, parseISO } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAccessUserFromRequest } from "@/lib/access";
import { createInvoices, type NewInvoiceInput } from "@/lib/database";

const bodySchema = z.object({
  realmId: z.string().min(3),
  accessToken: z.string().min(20)
});

interface QuickBooksInvoice {
  Id: string;
  CustomerRef?: {
    name?: string;
  };
  TotalAmt?: number;
  TxnDate?: string;
  DueDate?: string;
  Balance?: number;
  CurrencyRef?: {
    value?: string;
  };
}

interface QuickBooksResponse {
  QueryResponse?: {
    Invoice?: QuickBooksInvoice[];
  };
}

function normalizeQuickBooksInvoice(invoice: QuickBooksInvoice): NewInvoiceInput | null {
  const clientName = invoice.CustomerRef?.name?.trim();
  const totalAmt = Number(invoice.TotalAmt ?? 0);
  const issuedAt = invoice.TxnDate;
  const dueAt = invoice.DueDate;

  if (!clientName || !issuedAt || !dueAt || Number.isNaN(totalAmt)) {
    return null;
  }

  const balance = Number(invoice.Balance ?? totalAmt);
  const isPaid = balance <= 0;

  let status: NewInvoiceInput["status"] = "open";
  if (isPaid) {
    status = "paid";
  } else if (isBefore(parseISO(dueAt), new Date())) {
    status = "overdue";
  }

  return {
    externalId: invoice.Id,
    clientName,
    amountCents: Math.round(totalAmt * 100),
    issuedAt,
    dueAt,
    paidAt: isPaid ? dueAt : null,
    status,
    currency: invoice.CurrencyRef?.value || "USD",
    source: "quickbooks"
  };
}

function wantsHtml(request: NextRequest) {
  return request.headers.get("accept")?.includes("text/html") ?? false;
}

export async function POST(request: NextRequest) {
  const user = getAccessUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const html = wantsHtml(request);

  try {
    const contentType = request.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await request.json()
      : Object.fromEntries((await request.formData()).entries());

    const { realmId, accessToken } = bodySchema.parse(payload);

    const query = encodeURIComponent(
      "select Id, CustomerRef, TotalAmt, TxnDate, DueDate, Balance, CurrencyRef from Invoice maxresults 100"
    );

    const response = await fetch(
      `https://quickbooks.api.intuit.com/v3/company/${realmId}/query?query=${query}&minorversion=75`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json"
        },
        cache: "no-store"
      }
    );

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`QuickBooks API error: ${response.status} ${message}`);
    }

    const result = (await response.json()) as QuickBooksResponse;
    const normalized = (result.QueryResponse?.Invoice || [])
      .map(normalizeQuickBooksInvoice)
      .filter((invoice): invoice is NewInvoiceInput => invoice !== null);

    const inserted = await createInvoices(user.email, normalized);

    if (html) {
      return NextResponse.redirect(new URL(`/dashboard/integrations?quickbooks_imported=${inserted}`, request.url));
    }

    return NextResponse.json({ imported: inserted, fetched: normalized.length });
  } catch (error) {
    console.error("QuickBooks sync failed", error);

    if (html) {
      return NextResponse.redirect(new URL("/dashboard/integrations?quickbooks_error=1", request.url));
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", details: error.flatten() }, { status: 400 });
    }

    return NextResponse.json({ error: "QuickBooks sync failed" }, { status: 500 });
  }
}
