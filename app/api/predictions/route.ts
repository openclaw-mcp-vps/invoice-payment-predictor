import { NextRequest, NextResponse } from "next/server";

import { getAccessUserFromRequest } from "@/lib/access";
import { listInvoices } from "@/lib/database";
import { buildTimeline, generatePredictions, summarizePredictions } from "@/lib/prediction-engine";

export async function GET(request: NextRequest) {
  const user = getAccessUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const invoices = await listInvoices(user.email);
    const predictions = generatePredictions(invoices);
    const summary = summarizePredictions(invoices, predictions);
    const timeline = buildTimeline(invoices);

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      summary,
      predictions,
      timeline
    });
  } catch (error) {
    console.error("Failed to build predictions", error);
    return NextResponse.json({ error: "Failed to generate predictions" }, { status: 500 });
  }
}
