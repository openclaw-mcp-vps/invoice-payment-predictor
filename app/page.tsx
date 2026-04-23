import Link from "next/link";
import { ArrowRight, ChartNoAxesCombined, Clock3, ShieldAlert } from "lucide-react";

const faqs = [
  {
    question: "How does the predictor decide invoice risk?",
    answer:
      "It looks at client-specific delay history, invoice size, due-date timing patterns, and current aging. Each open invoice gets a risk score and a suggested next action."
  },
  {
    question: "Do I need accounting software to use this?",
    answer:
      "No. You can start by adding invoices manually or importing CSV. If you use QuickBooks or FreshBooks, connect through API tokens to sync recent invoices."
  },
  {
    question: "How fast can I get value?",
    answer:
      "Most users seed historical invoices and get first-risk insights in under 10 minutes. You immediately see which clients are likely to pay late and how much revenue is exposed."
  },
  {
    question: "What happens after I pay?",
    answer:
      "Stripe hosts checkout. After payment, redirect your Payment Link success URL to `/api/access/activate?session_id={CHECKOUT_SESSION_ID}` so access unlocks automatically via secure cookie."
  }
];

export default function HomePage() {
  const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <header className="mb-14 flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 px-5 py-4 backdrop-blur">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-sky-300">Invoice Billing Intelligence</p>
          <h1 className="mt-1 text-xl font-bold text-slate-100">Invoice Payment Predictor</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-sky-400/50 hover:text-white"
          >
            Dashboard
          </Link>
          <a
            href={paymentLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
          >
            Buy for $12/mo
            <ArrowRight size={16} />
          </a>
        </div>
      </header>

      <section className="grid gap-8 rounded-3xl border border-sky-400/20 bg-[#0f1826]/90 p-8 shadow-[0_20px_50px_rgba(2,8,23,0.45)] lg:grid-cols-[1.25fr_1fr]">
        <div>
          <p className="inline-flex rounded-full bg-sky-400/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">
            Predict Which Invoices Will Be Paid Late
          </p>
          <h2 className="mt-4 text-4xl font-extrabold leading-tight text-slate-50 sm:text-5xl">
            Stop waiting to discover a cash-flow problem.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-slate-300">
            Late payments drive the majority of small-business cash crunches. Invoice Payment Predictor spots delay
            risk early, ranks collection priorities, and shows exactly which clients need proactive follow-up.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-[#0d1420] p-4">
              <p className="text-2xl font-bold text-slate-100">82%</p>
              <p className="mt-1 text-sm text-slate-400">of SMB failures tie back to cash flow pressure</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#0d1420] p-4">
              <p className="text-2xl font-bold text-slate-100">6+ days</p>
              <p className="mt-1 text-sm text-slate-400">average delay saved with early intervention</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#0d1420] p-4">
              <p className="text-2xl font-bold text-slate-100">$12/mo</p>
              <p className="mt-1 text-sm text-slate-400">flat pricing for freelancers and agencies</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0c131e] p-6">
          <h3 className="text-lg font-semibold text-slate-100">What you get behind the paywall</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            <li className="flex items-start gap-3">
              <ChartNoAxesCombined className="mt-0.5 text-sky-300" size={16} />
              Per-invoice late-payment probability with confidence and delay estimate
            </li>
            <li className="flex items-start gap-3">
              <Clock3 className="mt-0.5 text-amber-300" size={16} />
              Monthly timeline showing average delay vs on-time rate trends
            </li>
            <li className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 text-rose-300" size={16} />
              Collection playbook actions based on risk tier and invoice value
            </li>
          </ul>

          <a
            href={paymentLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-sky-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-sky-400"
          >
            Start Preventing Late Payments
          </a>

          <p className="mt-3 text-center text-xs text-slate-500">
            Use Stripe Payment Link success redirect: <span className="text-slate-400">/api/access/activate?session_id=&#123;CHECKOUT_SESSION_ID&#125;</span>
          </p>
        </div>
      </section>

      <section className="mt-14 grid gap-6 lg:grid-cols-3">
        <article className="rounded-2xl border border-white/10 bg-[#101721] p-6">
          <h3 className="text-lg font-semibold text-slate-100">Problem</h3>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Most freelancers and small agencies react to late invoices after the due date. By then, payroll, tools,
            and tax obligations are already competing with missing revenue.
          </p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-[#101721] p-6">
          <h3 className="text-lg font-semibold text-slate-100">Solution</h3>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            The app analyzes historical behavior per client and invoice profile, then ranks your exposure with
            concrete steps: reminder cadence, escalation timing, and AP outreach recommendations.
          </p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-[#101721] p-6">
          <h3 className="text-lg font-semibold text-slate-100">Outcome</h3>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            You spend collection effort where it matters, shorten average payment lag, and stabilize predictable
            cash flow without adding enterprise billing software.
          </p>
        </article>
      </section>

      <section className="mt-16 rounded-3xl border border-emerald-500/20 bg-[#0e1a16] p-8">
        <h3 className="text-3xl font-bold text-slate-100">Simple Pricing</h3>
        <p className="mt-2 text-slate-300">
          Built for solo operators and lean teams that need immediate payment-risk visibility.
        </p>
        <div className="mt-6 max-w-md rounded-2xl border border-emerald-400/30 bg-[#102119] p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">Growth Plan</p>
          <p className="mt-2 text-4xl font-extrabold text-slate-100">
            $12<span className="text-lg font-medium text-slate-400">/month</span>
          </p>
          <ul className="mt-4 space-y-2 text-sm text-slate-300">
            <li>Unlimited invoice uploads</li>
            <li>Late-payment risk scoring and delay prediction</li>
            <li>QuickBooks and FreshBooks API import routes</li>
            <li>Collection recommendations per invoice</li>
          </ul>
          <a
            href={paymentLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-emerald-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-300"
          >
            Buy Access
          </a>
        </div>
      </section>

      <section className="mt-16">
        <h3 className="text-3xl font-bold text-slate-100">FAQ</h3>
        <div className="mt-6 space-y-4">
          {faqs.map((faq) => (
            <article key={faq.question} className="rounded-2xl border border-white/10 bg-[#101721] p-5">
              <h4 className="text-base font-semibold text-slate-100">{faq.question}</h4>
              <p className="mt-2 text-sm leading-6 text-slate-300">{faq.answer}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
