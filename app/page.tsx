import type { Metadata } from "next";
import { ArrowRight, BadgeAlert, Clock3, Wallet } from "lucide-react";

export const metadata: Metadata = {
  title: "Predict Which Invoices Will Be Paid Late",
  description:
    "Analyze invoice and payment behavior, spot high-risk accounts early, and trigger the right collection action before cash flow slips."
};

const faqs = [
  {
    question: "How does the risk score work?",
    answer:
      "The model compares each open invoice against client payment history, average delay, invoice amount patterns, and due-date timing. You get a 0-100 late-payment score plus the drivers behind it."
  },
  {
    question: "Will this work if I only have a few invoices?",
    answer:
      "Yes. The model falls back to global account behavior until there is enough client-specific history, so you still get actionable recommendations on day one."
  },
  {
    question: "Can I upload existing invoice exports?",
    answer:
      "Yes. Upload CSV exports from your invoicing tool or add invoices manually. The app maps dates, amounts, and payment status automatically and stores your data in Postgres."
  },
  {
    question: "What happens after I purchase?",
    answer:
      "Stripe Checkout handles payment. Once your payment clears, enter your purchase email on the unlock page and you get a secure access cookie to the predictor dashboard."
  }
];

const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-5 pb-20 pt-8 sm:px-8 lg:px-12">
      <header className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 backdrop-blur md:px-6">
        <p className="mono text-xs uppercase tracking-[0.2em] text-emerald-400">Invoice Billing</p>
        <div className="flex gap-2">
          <a
            href="/unlock"
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-emerald-500 hover:text-emerald-300"
          >
            Unlock Access
          </a>
          <a
            href={paymentLink}
            className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            Buy $12/mo
          </a>
        </div>
      </header>

      <section className="mt-8 grid gap-8 rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950/95 via-slate-900/85 to-slate-950/95 p-6 sm:p-10 lg:grid-cols-[1.2fr_1fr] lg:gap-12">
        <div>
          <p className="mono inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs uppercase tracking-widest text-orange-200">
            <BadgeAlert className="h-3.5 w-3.5" />
            Late Payments Kill Cash Flow
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-slate-50 sm:text-5xl">
            Predict which invoices will be paid late before they damage your runway.
          </h1>
          <p className="mt-4 max-w-xl text-base text-slate-300 sm:text-lg">
            82% of small businesses cite cash-flow pressure as a major failure risk. This app turns your
            invoice history into clear risk scores so you can collect earlier, prioritize outreach, and avoid
            revenue surprises.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href={paymentLink}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400"
            >
              Start for $12/month
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="/unlock"
              className="rounded-xl border border-slate-700 px-5 py-3 font-medium text-slate-100 transition hover:border-slate-500"
            >
              I already purchased
            </a>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 sm:p-6">
          <p className="mono text-xs uppercase tracking-[0.18em] text-slate-400">What You Get</p>
          <ul className="mt-4 space-y-4 text-sm text-slate-200 sm:text-base">
            <li className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="font-semibold text-emerald-300">Invoice Risk Scoring</p>
              <p className="mt-1 text-slate-300">
                Every open invoice gets a probability score with confidence drivers.
              </p>
            </li>
            <li className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="font-semibold text-emerald-300">Recommended Collection Actions</p>
              <p className="mt-1 text-slate-300">
                Know when to send reminders, when to escalate, and who needs a call today.
              </p>
            </li>
            <li className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="font-semibold text-emerald-300">CSV + Manual Entry</p>
              <p className="mt-1 text-slate-300">
                Start with an export today, then keep data fresh with quick invoice updates.
              </p>
            </li>
          </ul>
        </div>
      </section>

      <section className="mt-14 grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
          <Clock3 className="h-5 w-5 text-orange-300" />
          <h2 className="mt-3 text-lg font-semibold text-slate-100">Problem</h2>
          <p className="mt-2 text-sm text-slate-300">
            Most freelancers and small agencies track invoices in spreadsheets, but not payment behavior.
            Delays look random until payroll and vendor bills are due.
          </p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
          <Wallet className="h-5 w-5 text-emerald-300" />
          <h2 className="mt-3 text-lg font-semibold text-slate-100">Solution</h2>
          <p className="mt-2 text-sm text-slate-300">
            We analyze amount, timing, and historical patterns to forecast lateness so collections become
            proactive, not reactive.
          </p>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5">
          <BadgeAlert className="h-5 w-5 text-cyan-300" />
          <h2 className="mt-3 text-lg font-semibold text-slate-100">Outcome</h2>
          <p className="mt-2 text-sm text-slate-300">
            Protect monthly cash flow by focusing follow-up effort on invoices most likely to slip.
          </p>
        </article>
      </section>

      <section className="mt-14 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 sm:p-10">
        <h2 className="text-2xl font-semibold text-slate-50 sm:text-3xl">Pricing</h2>
        <p className="mt-2 text-slate-300">One plan. Built for independent operators and small teams.</p>
        <div className="mt-6 max-w-md rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
          <p className="mono text-xs uppercase tracking-[0.18em] text-emerald-300">Growth Plan</p>
          <p className="mt-2 text-4xl font-semibold text-slate-50">$12<span className="text-xl text-slate-300">/mo</span></p>
          <ul className="mt-4 space-y-2 text-sm text-slate-200">
            <li>Unlimited invoice records</li>
            <li>Risk predictions + collection recommendations</li>
            <li>Client-level payment behavior insights</li>
            <li>CSV import and manual invoice management</li>
          </ul>
          <a
            href={paymentLink}
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            Buy With Stripe Checkout
          </a>
        </div>
      </section>

      <section className="mt-14 rounded-3xl border border-slate-800 bg-slate-950/70 p-6 sm:p-10">
        <h2 className="text-2xl font-semibold text-slate-50 sm:text-3xl">FAQ</h2>
        <div className="mt-6 grid gap-4">
          {faqs.map((faq) => (
            <article key={faq.question} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <h3 className="text-base font-semibold text-slate-100">{faq.question}</h3>
              <p className="mt-2 text-sm text-slate-300">{faq.answer}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
