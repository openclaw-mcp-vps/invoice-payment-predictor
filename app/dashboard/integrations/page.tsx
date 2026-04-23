import { requireAccessUser } from "@/lib/server-paywall";

export default async function IntegrationsPage() {
  await requireAccessUser();

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-[#101721] p-6">
        <h1 className="text-2xl font-bold text-slate-100">Integrations</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">
          Sync invoice history from QuickBooks and FreshBooks by posting API credentials. Imported invoices are
          normalized into the prediction engine immediately.
        </p>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <form method="post" action="/api/integrations/quickbooks" className="space-y-4 rounded-2xl border border-white/10 bg-[#111925] p-5">
          <h2 className="text-lg font-semibold text-slate-100">QuickBooks Online</h2>
          <p className="text-sm text-slate-400">
            Requires an OAuth access token and your realm/company ID.
          </p>
          <label className="block space-y-1 text-sm text-slate-300">
            Realm ID
            <input
              required
              name="realmId"
              className="w-full rounded-lg border-white/15 bg-[#0d1420] text-slate-100"
              placeholder="123145879012345"
            />
          </label>
          <label className="block space-y-1 text-sm text-slate-300">
            Access Token
            <textarea
              required
              name="accessToken"
              rows={4}
              className="w-full rounded-lg border-white/15 bg-[#0d1420] font-mono text-xs text-slate-100"
              placeholder="eyJhbGciOi..."
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
          >
            Sync QuickBooks Invoices
          </button>
        </form>

        <form method="post" action="/api/integrations/freshbooks" className="space-y-4 rounded-2xl border border-white/10 bg-[#111925] p-5">
          <h2 className="text-lg font-semibold text-slate-100">FreshBooks</h2>
          <p className="text-sm text-slate-400">
            Requires an OAuth access token and your FreshBooks account ID.
          </p>
          <label className="block space-y-1 text-sm text-slate-300">
            Account ID
            <input
              required
              name="accountId"
              className="w-full rounded-lg border-white/15 bg-[#0d1420] text-slate-100"
              placeholder="A1B2C3D4"
            />
          </label>
          <label className="block space-y-1 text-sm text-slate-300">
            Access Token
            <textarea
              required
              name="accessToken"
              rows={4}
              className="w-full rounded-lg border-white/15 bg-[#0d1420] font-mono text-xs text-slate-100"
              placeholder="eyJ0eXAiOi..."
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
          >
            Sync FreshBooks Invoices
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#101721] p-6 text-sm text-slate-300">
        <h2 className="text-lg font-semibold text-slate-100">Webhook Endpoints</h2>
        <ul className="mt-3 space-y-2 text-slate-300">
          <li>
            Stripe checkout events: <code className="rounded bg-black/30 px-2 py-1 text-sky-300">/api/webhooks/stripe</code>
          </li>
          <li>
            Lemon Squeezy events: <code className="rounded bg-black/30 px-2 py-1 text-amber-300">/api/webhooks/lemon-squeezy</code>
          </li>
        </ul>
      </section>
    </div>
  );
}
