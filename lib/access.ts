import crypto from "node:crypto";

import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export const ACCESS_COOKIE_NAME = "ipp_access";

export interface AccessUser {
  email: string;
  exp: number;
}

function getSigningSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET || "dev-invoice-payment-predictor-secret";
}

function encode(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}

function decode(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(payload: string) {
  return crypto.createHmac("sha256", getSigningSecret()).update(payload).digest("base64url");
}

export function createAccessToken(email: string, ttlDays = 45) {
  const normalizedEmail = email.trim().toLowerCase();
  const body = encode(
    JSON.stringify({
      email: normalizedEmail,
      exp: Date.now() + ttlDays * 24 * 60 * 60 * 1000
    })
  );
  return `${body}.${sign(body)}`;
}

export function verifyAccessToken(token: string | undefined | null): AccessUser | null {
  if (!token) {
    return null;
  }

  const [encodedBody, providedSignature] = token.split(".");
  if (!encodedBody || !providedSignature) {
    return null;
  }

  const expectedSignature = sign(encodedBody);
  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (providedBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const parsed = JSON.parse(decode(encodedBody)) as AccessUser;
    if (!parsed.email || typeof parsed.exp !== "number") {
      return null;
    }

    if (Date.now() > parsed.exp) {
      return null;
    }

    return { email: parsed.email.toLowerCase(), exp: parsed.exp };
  } catch {
    return null;
  }
}

export async function getAccessUserFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
  return verifyAccessToken(token);
}

export function getAccessUserFromRequest(request: NextRequest) {
  return verifyAccessToken(request.cookies.get(ACCESS_COOKIE_NAME)?.value);
}
