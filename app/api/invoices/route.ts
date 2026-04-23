import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createInvoice, listInvoices } from "@/lib/db";
import { getAccessEmailFromCookieHeader } from "@/lib/paywall";

const invoiceSchema = z.object({
  clientName: z.string().min(2),
  clientEmail: z.string().email().optional().nullable(),
  issueDate: z.string().min(8),
  dueDate: z.string().min(8),
  paidDate: z.string().min(8).optional().nullable(),
  amount: z.number().positive(),
  currency: z.string().length(3).optional(),
  status: z.enum(["PAID", "UNPAID"]).optional(),
  notes: z.string().max(2000).optional().nullable()
});

export const dynamic = "force-dynamic";

function ensureAuthorized(request: NextRequest) {
  const email = getAccessEmailFromCookieHeader(request.headers.get("cookie"));
  if (!email) {
    return null;
  }
  return email;
}

export async function GET(request: NextRequest) {
  if (!ensureAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invoices = await listInvoices();
  return NextResponse.json({ invoices });
}

export async function POST(request: NextRequest) {
  if (!ensureAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await request.json();
    const payload = invoiceSchema.parse(json);

    const invoice = await createInvoice({
      clientName: payload.clientName,
      clientEmail: payload.clientEmail,
      issueDate: payload.issueDate,
      dueDate: payload.dueDate,
      paidDate: payload.paidDate,
      amountCents: Math.round(payload.amount * 100),
      currency: payload.currency,
      status: payload.status,
      notes: payload.notes
    });

    return NextResponse.json({ message: "Invoice saved successfully.", invoice }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid invoice payload.", details: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to save invoice."
      },
      { status: 500 }
    );
  }
}
