import { NextResponse } from "next/server";
import { z } from "zod";
import { getActiveSubscriptionByEmail } from "@/lib/db";
import { ACCESS_COOKIE_NAME, createAccessToken } from "@/lib/paywall";

const bodySchema = z.object({
  email: z.string().email()
});

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = bodySchema.parse(await request.json());
    const subscription = await getActiveSubscriptionByEmail(payload.email);

    if (!subscription) {
      return NextResponse.json(
        {
          error:
            "No active subscription found for this email yet. Complete Stripe checkout and ensure webhook delivery, then retry."
        },
        { status: 403 }
      );
    }

    const response = NextResponse.json({ ok: true });

    response.cookies.set({
      name: ACCESS_COOKIE_NAME,
      value: createAccessToken(subscription.email),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to verify subscription."
      },
      { status: 500 }
    );
  }
}

export function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ACCESS_COOKIE_NAME,
    value: "",
    maxAge: 0,
    path: "/"
  });
  return response;
}
