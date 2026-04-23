import { isBefore, parseISO } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getAccessUserFromRequest } from "@/lib/access";
import { createInvoices, type NewInvoiceInput } from "@/lib/database";

const bodySchema = z.object({
  accountId: z.string().min(2),
  accessToken: z.string().min(20)
});

interface FreshBooksInvoice {
  id?: number;
  organization?: string;
  amount?: {
    amount?: string;
    code?: string;
  };
  create_date?: string;
  due_date?: string;
  paid_status?: string;
  status?: string;
  outstanding?: {
    amount?: string;
  };
}

interface FreshBooksResponse {
  response?: {
    result?: {
      invoices?: FreshBooksInvoice[];
    };
  };
}

function normalizeFreshBooksInvoice(invoice: FreshBooksInvoice): NewInvoiceInput | null {
  const clientName = invoice.organization?.trim();
  const amountValue = Number(invoice.amount?.amount ?? 0);
  const issuedAt = invoice.create_date;
  const dueAt = invoice.due_date;

  if (!clientName || !issuedAt || !dueAt || Number.isNaN(amountValue)) {
    return null;
  }

  const outstanding = Number(invoice.outstanding?.amount ?? amountValue);
  const isPaid = invoice.paid_status === "paid" || invoice.status === "paid" || outstanding <= 0;

  let status: NewInvoiceInput["status"] = "open";
  if (isPaid) {
    status = "paid";
  } else if (isBefore(parseISO(dueAt), new Date())) {
    status = "overdue";
  }

  return {
    externalId: invoice.id ? String(invoice.id) : null,
    clientName,
    amountCents: Math.round(amountValue * 100),
    issuedAt,
    dueAt,
    paidAt: isPaid ? dueAt : null,
    status,
    currency: invoice.amount?.code || "USD",
    source: "freshbooks"
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

    const { accountId, accessToken } = bodySchema.parse(payload);

    const response = await fetch(
      `https://api.freshbooks.com/accounting/account/${accountId}/invoices/invoices?per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Api-Version": "alpha",
          "Content-Type": "application/json"
        },
        cache: "no-store"
      }
    );

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`FreshBooks API error: ${response.status} ${message}`);
    }

    const result = (await response.json()) as FreshBooksResponse;
    const normalized = (result.response?.result?.invoices || [])
      .map(normalizeFreshBooksInvoice)
      .filter((invoice): invoice is NewInvoiceInput => invoice !== null);

    const inserted = await createInvoices(user.email, normalized);

    if (html) {
      return NextResponse.redirect(new URL(`/dashboard/integrations?freshbooks_imported=${inserted}`, request.url));
    }

    return NextResponse.json({ imported: inserted, fetched: normalized.length });
  } catch (error) {
    console.error("FreshBooks sync failed", error);

    if (html) {
      return NextResponse.redirect(new URL("/dashboard/integrations?freshbooks_error=1", request.url));
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", details: error.flatten() }, { status: 400 });
    }

    return NextResponse.json({ error: "FreshBooks sync failed" }, { status: 500 });
  }
}
