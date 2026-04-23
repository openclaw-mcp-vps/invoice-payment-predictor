import { NextRequest, NextResponse } from "next/server";

import { upsertAccessEvent } from "@/lib/database";
import { parseLemonWebhook, verifyLemonSignature } from "@/lib/lemon-squeezy";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");

  if (!verifyLemonSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid Lemon Squeezy signature" }, { status: 400 });
  }

  try {
    const parsed = parseLemonWebhook(rawBody);

    await upsertAccessEvent({
      provider: "lemon_squeezy",
      eventKey: parsed.eventKey,
      customerEmail: parsed.customerEmail,
      paid: parsed.paid,
      metadata: {
        lemonEventName: parsed.eventName,
        payload: parsed.payload
      }
    });

    return NextResponse.json({ received: true, event: parsed.eventName });
  } catch (error) {
    console.error("Failed to parse Lemon Squeezy webhook", error);
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }
}
