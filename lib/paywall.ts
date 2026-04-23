import { createHmac, timingSafeEqual } from "node:crypto";

interface AccessTokenPayload {
  email: string;
  exp: number;
}

export const ACCESS_COOKIE_NAME = "ipp_access";

function getSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET || "dev-only-change-this-secret";
}

function encodePayload(payload: AccessTokenPayload) {
  return Buffer.from(JSON.stringify(payload), "utf-8").toString("base64url");
}

function decodePayload(encoded: string) {
  try {
    const text = Buffer.from(encoded, "base64url").toString("utf-8");
    return JSON.parse(text) as AccessTokenPayload;
  } catch {
    return null;
  }
}

function sign(encodedPayload: string) {
  return createHmac("sha256", getSecret()).update(encodedPayload).digest("base64url");
}

export function createAccessToken(email: string, expiresInDays = 30) {
  const payload: AccessTokenPayload = {
    email: email.trim().toLowerCase(),
    exp: Date.now() + expiresInDays * 24 * 60 * 60 * 1000
  };

  const encoded = encodePayload(payload);
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

export function verifyAccessToken(token: string | null | undefined) {
  if (!token) {
    return null;
  }

  const [encodedPayload, suppliedSignature] = token.split(".");

  if (!encodedPayload || !suppliedSignature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);
  const suppliedBuffer = Buffer.from(suppliedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (suppliedBuffer.length !== expectedBuffer.length) {
    return null;
  }

  const matches = timingSafeEqual(suppliedBuffer, expectedBuffer);
  if (!matches) {
    return null;
  }

  const payload = decodePayload(encodedPayload);
  if (!payload) {
    return null;
  }

  if (!payload.email || payload.exp <= Date.now()) {
    return null;
  }

  return payload;
}

export function getAccessEmailFromCookieHeader(cookieHeader: string | null | undefined) {
  if (!cookieHeader) {
    return null;
  }

  const token = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ACCESS_COOKIE_NAME}=`))
    ?.split("=")
    .slice(1)
    .join("=");

  if (!token) {
    return null;
  }

  const payload = verifyAccessToken(token);
  return payload?.email || null;
}
