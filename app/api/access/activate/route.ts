import { NextRequest, NextResponse } from "next/server";

import { ACCESS_COOKIE_NAME, createAccessToken } from "@/lib/access";
import { findPaidAccessEvent } from "@/lib/database";

function redirectToHomeWithMessage(request: NextRequest, code: string) {
  return NextResponse.redirect(new URL(`/?activation=${code}`, request.url));
}

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");
  const lemonOrderId = request.nextUrl.searchParams.get("order_id");

  if (!sessionId && !lemonOrderId) {
    return redirectToHomeWithMessage(request, "missing_session");
  }

  try {
    const stripeEvent = sessionId ? await findPaidAccessEvent("stripe", sessionId) : null;
    const lemonEvent = lemonOrderId ? await findPaidAccessEvent("lemon_squeezy", lemonOrderId) : null;

    const sourceEvent = stripeEvent ?? lemonEvent;
    if (!sourceEvent?.customer_email) {
      return redirectToHomeWithMessage(request, "pending_webhook");
    }

    const response = NextResponse.redirect(new URL("/dashboard?activated=1", request.url));
    response.cookies.set({
      name: ACCESS_COOKIE_NAME,
      value: createAccessToken(sourceEvent.customer_email),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 45 * 24 * 60 * 60
    });

    return response;
  } catch (error) {
    console.error("Failed to activate access", error);
    return redirectToHomeWithMessage(request, "activation_error");
  }
}
