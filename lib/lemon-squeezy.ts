import crypto from "node:crypto";

import { lemonSqueezySetup } from "@lemonsqueezy/lemonsqueezy.js";

export interface LemonSqueezyWebhookPayload {
  meta?: {
    event_name?: string;
    custom_data?: {
      email?: string;
      [key: string]: unknown;
    };
  };
  data?: {
    id?: string;
    attributes?: {
      user_email?: string;
      status?: string;
      [key: string]: unknown;
    };
  };
}

export interface ParsedLemonEvent {
  eventName: string;
  eventKey: string;
  customerEmail: string | null;
  paid: boolean;
  payload: LemonSqueezyWebhookPayload;
}

export function setupLemonSqueezy() {
  const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
  if (!apiKey) {
    return;
  }

  lemonSqueezySetup({
    apiKey,
    onError: (error) => {
      console.error("Lemon Squeezy setup error", error);
    }
  });
}

export function verifyLemonSignature(rawBody: string, signature: string | null) {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  if (!secret || !signature) {
    return false;
  }

  const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const digestBuffer = Buffer.from(digest);
  const signatureBuffer = Buffer.from(signature);

  if (digestBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(digestBuffer, signatureBuffer);
}

export function parseLemonWebhook(rawBody: string): ParsedLemonEvent {
  const payload = JSON.parse(rawBody) as LemonSqueezyWebhookPayload;

  const eventName = payload.meta?.event_name || "unknown";
  const status = payload.data?.attributes?.status;

  const paidStatuses = new Set([
    "paid",
    "active",
    "on_trial",
    "on_trial_paused",
    "renews"
  ]);

  const paid =
    eventName.includes("order") ||
    eventName.includes("subscription_payment") ||
    (status ? paidStatuses.has(status) : false);

  const customerEmail =
    payload.data?.attributes?.user_email ||
    payload.meta?.custom_data?.email ||
    null;

  const eventKey = String(payload.data?.id || `${eventName}-${Date.now()}`);

  return {
    eventName,
    eventKey,
    customerEmail,
    paid,
    payload
  };
}
