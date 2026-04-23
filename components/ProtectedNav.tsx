import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";

interface ProtectedNavProps {
  email: string;
}

export function ProtectedNav({ email }: ProtectedNavProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 sm:px-6">
      <div>
        <p className="mono text-xs uppercase tracking-[0.2em] text-emerald-400">Invoice Payment Predictor</p>
        <p className="mt-1 text-xs text-slate-400">Signed in as {email}</p>
      </div>

      <nav className="flex flex-wrap items-center gap-2 text-sm">
        <Link
          href="/dashboard"
          className="rounded-lg border border-slate-700 px-3 py-2 text-slate-200 transition hover:border-emerald-500"
        >
          Dashboard
        </Link>
        <Link
          href="/invoices"
          className="rounded-lg border border-slate-700 px-3 py-2 text-slate-200 transition hover:border-emerald-500"
        >
          Invoices
        </Link>
        <Link
          href="/predictions"
          className="rounded-lg border border-slate-700 px-3 py-2 text-slate-200 transition hover:border-emerald-500"
        >
          Predictions
        </Link>
        <LogoutButton />
      </nav>
    </header>
  );
}
