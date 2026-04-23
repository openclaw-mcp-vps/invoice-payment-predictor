import { NextRequest, NextResponse } from "next/server";
import { listInvoices } from "@/lib/db";
import { getAccessEmailFromCookieHeader } from "@/lib/paywall";
import { generatePredictions } from "@/lib/prediction-engine";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const email = getAccessEmailFromCookieHeader(request.headers.get("cookie"));
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invoices = await listInvoices();
  const data = generatePredictions(invoices);
  return NextResponse.json(data);
}
