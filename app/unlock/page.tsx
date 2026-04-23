import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { UnlockForm } from "@/components/UnlockForm";
import { getAccessEmailFromCookie } from "@/lib/access";

export const metadata: Metadata = {
  title: "Unlock Access",
  description: "Activate your paid access to the Invoice Payment Predictor dashboard."
};

export const dynamic = "force-dynamic";

export default async function UnlockPage() {
  const existingAccess = await getAccessEmailFromCookie();

  if (existingAccess) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto max-w-5xl px-5 pb-16 pt-8 sm:px-8">
      <UnlockForm paymentLink={process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || "#"} />
    </main>
  );
}
