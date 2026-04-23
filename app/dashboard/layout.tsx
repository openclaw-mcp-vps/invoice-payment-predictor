import Link from "next/link";

import { requireAccessUser } from "@/lib/server-paywall";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAccessUser();

  return (
    <div className="min-h-screen bg-[#0d1117]">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0d1117]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-sky-300">Invoice Payment Predictor</p>
            <p className="mt-1 text-sm text-slate-400">Signed in as {user.email}</p>
          </div>
          <nav className="flex flex-wrap gap-2 text-sm">
            <Link href="/dashboard" className="rounded-lg border border-white/15 px-3 py-1.5 text-slate-200 hover:border-sky-400/50">
              Overview
            </Link>
            <Link
              href="/dashboard/invoices"
              className="rounded-lg border border-white/15 px-3 py-1.5 text-slate-200 hover:border-sky-400/50"
            >
              Invoices
            </Link>
            <Link
              href="/dashboard/predictions"
              className="rounded-lg border border-white/15 px-3 py-1.5 text-slate-200 hover:border-sky-400/50"
            >
              Predictions
            </Link>
            <Link
              href="/dashboard/integrations"
              className="rounded-lg border border-white/15 px-3 py-1.5 text-slate-200 hover:border-sky-400/50"
            >
              Integrations
            </Link>
            <a href="/api/access/logout" className="rounded-lg border border-rose-500/30 px-3 py-1.5 text-rose-300 hover:border-rose-400/60">
              Log out
            </a>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
}
