import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { upsertSubscription } from "@/lib/db";

interface StripeEvent {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
}

function verifyStripeSignature(payload: string, signatureHeader: string, secret: string) {
  const parts = signatureHeader.split(",").map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
  const signatures = parts.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));

  if (!timestamp || signatures.length === 0) {
    return false;
  }

  const age = Math.abs(Date.now() - Number(timestamp) * 1000);
  if (!Number.isFinite(age) || age > 5 * 60 * 1000) {
    return false;
  }

  const signedPayload = `${timestamp}.${payload}`;
  const expected = createHmac("sha256", secret).update(signedPayload).digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  return signatures.some((signature) => {
    const candidate = Buffer.from(signature, "hex");
    if (candidate.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(candidate, expectedBuffer);
  });
}

function getEmailFromObject(object: Record<string, unknown>) {
  const customerEmail = object.customer_email;
  if (typeof customerEmail === "string") {
    return customerEmail;
  }

  const customerDetails = object.customer_details;
  if (
    customerDetails &&
    typeof customerDetails === "object" &&
    "email" in customerDetails &&
    typeof customerDetails.email === "string"
  ) {
    return customerDetails.email;
  }

  const receiptEmail = object.receipt_email;
  if (typeof receiptEmail === "string") {
    return receiptEmail;
  }

  return null;
}

function getCurrentPeriodEnd(object: Record<string, unknown>) {
  const value = object.current_period_end;
  if (typeof value === "number") {
    return new Date(value * 1000).toISOString();
  }

  const fallback = object.expires_at;
  if (typeof fallback === "number") {
    return new Date(fallback * 1000).toISOString();
  }

  return null;
}

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");

  if (!secret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is not configured." }, { status: 500 });
  }

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  const payload = await request.text();
  const isValidSignature = verifyStripeSignature(payload, signature, secret);

  if (!isValidSignature) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  const event = JSON.parse(payload) as StripeEvent;
  const object = event.data.object;
  const email = getEmailFromObject(object);

  if (!email) {
    return NextResponse.json({ received: true, skipped: true, reason: "No customer email found." });
  }

  if (event.type === "checkout.session.completed" || event.type === "invoice.paid") {
    await upsertSubscription({
      email,
      status: "active",
      source: "stripe",
      lastEventId: event.id,
      currentPeriodEnd: getCurrentPeriodEnd(object)
    });
  }

  if (event.type === "invoice.payment_failed") {
    await upsertSubscription({
      email,
      status: "past_due",
      source: "stripe",
      lastEventId: event.id,
      currentPeriodEnd: getCurrentPeriodEnd(object)
    });
  }

  if (event.type === "customer.subscription.deleted") {
    await upsertSubscription({
      email,
      status: "canceled",
      source: "stripe",
      lastEventId: event.id,
      currentPeriodEnd: getCurrentPeriodEnd(object)
    });
  }

  return NextResponse.json({ received: true });
}
