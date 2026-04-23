import { NextResponse } from "next/server";

export function POST() {
  return NextResponse.json(
    {
      error:
        "Lemon Squeezy webhook is not used in this build. Configure Stripe webhook at /api/webhooks/stripe instead."
    },
    { status: 410 }
  );
}
