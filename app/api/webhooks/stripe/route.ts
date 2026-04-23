import crypto from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { upsertAccessEvent } from "@/lib/database";

interface StripeEvent {
  id: string;
  type: string;
  data: {
    object: {
      id?: string;
      customer_email?: string | null;
      customer_details?: {
        email?: string | null;
      };
      [key: string]: unknown;
    };
  };
}

function parseStripeSignature(signatureHeader: string) {
  const parts = signatureHeader.split(",").map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
  const signatures = parts
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3));

  return { timestamp, signatures };
}

function verifyStripeSignature(rawBody: string, signatureHeader: string, secret: string) {
  const { timestamp, signatures } = parseStripeSignature(signatureHeader);

  if (!timestamp || signatures.length === 0) {
    return false;
  }

  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");
  const expectedBuffer = Buffer.from(expected);

  const timestampAgeSeconds = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (Number.isNaN(timestampAgeSeconds) || timestampAgeSeconds > 5 * 60) {
    return false;
  }

  return signatures.some((signature) => {
    const signatureBuffer = Buffer.from(signature);
    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  });
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is not configured" }, { status: 500 });
  }

  const signatureHeader = request.headers.get("stripe-signature");
  if (!signatureHeader) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const rawBody = await request.text();
  if (!verifyStripeSignature(rawBody, signatureHeader, webhookSecret)) {
    return NextResponse.json({ error: "Invalid Stripe signature" }, { status: 400 });
  }

  try {
    const event = JSON.parse(rawBody) as StripeEvent;

    if (event.type === "checkout.session.completed") {
      const sessionId = event.data.object.id;
      const customerEmail =
        event.data.object.customer_details?.email || event.data.object.customer_email || null;

      if (sessionId) {
        await upsertAccessEvent({
          provider: "stripe",
          eventKey: sessionId,
          customerEmail,
          paid: true,
          metadata: {
            stripeEventId: event.id,
            stripeEventType: event.type,
            object: event.data.object
          }
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed", error);
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }
}
