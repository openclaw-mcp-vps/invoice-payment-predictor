"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

interface UnlockFormProps {
  paymentLink: string;
}

export function UnlockForm({ paymentLink }: UnlockFormProps) {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error || "Unable to unlock access.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to unlock access.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mx-auto mt-8 max-w-xl rounded-2xl border border-slate-800 bg-slate-950/70 p-6 sm:p-8">
      <h1 className="text-2xl font-semibold text-slate-50">Unlock Predictor Access</h1>
      <p className="mt-2 text-sm text-slate-300">
        Purchase with Stripe first, then enter the same billing email to activate your secure access cookie.
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <a
          href={paymentLink}
          className="rounded-lg bg-emerald-500 px-4 py-2.5 font-semibold text-slate-950 transition hover:bg-emerald-400"
        >
          Buy $12/mo in Stripe Checkout
        </a>
        <a
          href="/"
          className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-200 transition hover:border-slate-500"
        >
          Back to landing page
        </a>
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <label className="block text-sm text-slate-300">
          Purchase email
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@agency.com"
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:border-emerald-500"
          />
        </label>

        <button
          disabled={isSubmitting}
          type="submit"
          className="rounded-lg bg-cyan-500 px-4 py-2.5 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          {isSubmitting ? "Verifying..." : "Unlock Dashboard"}
        </button>

        {error ? <p className="text-sm text-orange-300">{error}</p> : null}
      </form>

      <p className="mt-5 text-xs text-slate-400">
        Stripe webhook events mark paid subscriptions as active. If checkout is complete but unlock fails, confirm your webhook
        is configured and retry in one minute.
      </p>
    </section>
  );
}
