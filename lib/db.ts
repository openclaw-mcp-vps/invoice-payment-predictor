import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import type { InvoiceInput, InvoiceRecord, InvoiceStatus, SubscriptionRecord, SubscriptionStatus } from "@/lib/types";

interface LocalStore {
  invoices: InvoiceRecord[];
  subscriptions: SubscriptionRecord[];
}

const LOCAL_DB_PATH = path.join(process.cwd(), "data", "store.json");
const DEFAULT_STORE: LocalStore = {
  invoices: [],
  subscriptions: []
};

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

function shouldUsePostgres() {
  return Boolean(process.env.DATABASE_URL);
}

function getPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set.");
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
  }

  return pool;
}

function normalizeDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function normalizeStatus(status: InvoiceStatus | null | undefined, paidDate: string | null) {
  if (status) {
    return status;
  }

  return paidDate ? "PAID" : "UNPAID";
}

function sanitizeEmail(email: string | null | undefined) {
  if (!email) {
    return null;
  }

  return email.trim().toLowerCase() || null;
}

async function ensureSchema() {
  if (!shouldUsePostgres()) {
    return;
  }

  if (!schemaReady) {
    const pg = getPool();
    schemaReady = (async () => {
      await pg.query(`
        CREATE TABLE IF NOT EXISTS invoices (
          id TEXT PRIMARY KEY,
          client_name TEXT NOT NULL,
          client_email TEXT,
          issue_date DATE NOT NULL,
          due_date DATE NOT NULL,
          paid_date DATE,
          amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
          currency TEXT NOT NULL DEFAULT 'USD',
          status TEXT NOT NULL CHECK (status IN ('PAID', 'UNPAID')),
          notes TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices (due_date);
        CREATE INDEX IF NOT EXISTS idx_invoices_client_email ON invoices (client_email);

        CREATE TABLE IF NOT EXISTS subscriptions (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          status TEXT NOT NULL CHECK (status IN ('active', 'past_due', 'canceled')),
          source TEXT NOT NULL,
          last_event_id TEXT,
          current_period_end TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions (status);
      `);
    })();
  }

  await schemaReady;
}

async function readLocalStore() {
  await fs.mkdir(path.dirname(LOCAL_DB_PATH), { recursive: true });

  try {
    const raw = await fs.readFile(LOCAL_DB_PATH, "utf-8");
    return JSON.parse(raw) as LocalStore;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      await fs.writeFile(LOCAL_DB_PATH, JSON.stringify(DEFAULT_STORE, null, 2), "utf-8");
      return structuredClone(DEFAULT_STORE);
    }

    throw error;
  }
}

async function writeLocalStore(store: LocalStore) {
  await fs.writeFile(LOCAL_DB_PATH, JSON.stringify(store, null, 2), "utf-8");
}

function mapPgInvoice(row: {
  id: string;
  client_name: string;
  client_email: string | null;
  issue_date: string;
  due_date: string;
  paid_date: string | null;
  amount_cents: number;
  currency: string;
  status: InvoiceStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}): InvoiceRecord {
  return {
    id: row.id,
    clientName: row.client_name,
    clientEmail: row.client_email,
    issueDate: row.issue_date,
    dueDate: row.due_date,
    paidDate: row.paid_date,
    amountCents: Number(row.amount_cents),
    currency: row.currency,
    status: row.status,
    notes: row.notes,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

function mapPgSubscription(row: {
  id: string;
  email: string;
  status: SubscriptionStatus;
  source: string;
  last_event_id: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}): SubscriptionRecord {
  return {
    id: row.id,
    email: row.email,
    status: row.status,
    source: row.source,
    lastEventId: row.last_event_id,
    currentPeriodEnd: row.current_period_end,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

export async function listInvoices(): Promise<InvoiceRecord[]> {
  if (shouldUsePostgres()) {
    await ensureSchema();
    const result = await getPool().query(`
      SELECT
        id,
        client_name,
        client_email,
        issue_date,
        due_date,
        paid_date,
        amount_cents,
        currency,
        status,
        notes,
        created_at,
        updated_at
      FROM invoices
      ORDER BY due_date DESC, created_at DESC
    `);

    return result.rows.map(mapPgInvoice);
  }

  const store = await readLocalStore();
  return [...store.invoices].sort((a, b) => b.dueDate.localeCompare(a.dueDate));
}

export async function createInvoice(input: InvoiceInput): Promise<InvoiceRecord> {
  const issueDate = normalizeDate(input.issueDate);
  const dueDate = normalizeDate(input.dueDate);
  const paidDate = normalizeDate(input.paidDate);

  if (!issueDate || !dueDate) {
    throw new Error("Issue date and due date are required.");
  }

  const now = new Date().toISOString();
  const invoice: InvoiceRecord = {
    id: randomUUID(),
    clientName: input.clientName.trim(),
    clientEmail: sanitizeEmail(input.clientEmail),
    issueDate,
    dueDate,
    paidDate,
    amountCents: Math.max(0, Math.round(input.amountCents)),
    currency: (input.currency || "USD").toUpperCase(),
    status: normalizeStatus(input.status, paidDate),
    notes: input.notes?.trim() || null,
    createdAt: now,
    updatedAt: now
  };

  if (shouldUsePostgres()) {
    await ensureSchema();
    await getPool().query(
      `
      INSERT INTO invoices (
        id,
        client_name,
        client_email,
        issue_date,
        due_date,
        paid_date,
        amount_cents,
        currency,
        status,
        notes,
        created_at,
        updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    `,
      [
        invoice.id,
        invoice.clientName,
        invoice.clientEmail,
        invoice.issueDate,
        invoice.dueDate,
        invoice.paidDate,
        invoice.amountCents,
        invoice.currency,
        invoice.status,
        invoice.notes,
        invoice.createdAt,
        invoice.updatedAt
      ]
    );

    return invoice;
  }

  const store = await readLocalStore();
  store.invoices.push(invoice);
  await writeLocalStore(store);

  return invoice;
}

export async function bulkCreateInvoices(inputs: InvoiceInput[]): Promise<number> {
  const validInputs = inputs.filter((input) => input.clientName.trim().length > 0);

  if (validInputs.length === 0) {
    return 0;
  }

  if (shouldUsePostgres()) {
    await ensureSchema();
    const client = await getPool().connect();

    try {
      await client.query("BEGIN");

      for (const input of validInputs) {
        const issueDate = normalizeDate(input.issueDate);
        const dueDate = normalizeDate(input.dueDate);

        if (!issueDate || !dueDate) {
          continue;
        }

        const paidDate = normalizeDate(input.paidDate);
        const now = new Date().toISOString();

        await client.query(
          `
          INSERT INTO invoices (
            id,
            client_name,
            client_email,
            issue_date,
            due_date,
            paid_date,
            amount_cents,
            currency,
            status,
            notes,
            created_at,
            updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        `,
          [
            randomUUID(),
            input.clientName.trim(),
            sanitizeEmail(input.clientEmail),
            issueDate,
            dueDate,
            paidDate,
            Math.max(0, Math.round(input.amountCents)),
            (input.currency || "USD").toUpperCase(),
            normalizeStatus(input.status, paidDate),
            input.notes?.trim() || null,
            now,
            now
          ]
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    return validInputs.length;
  }

  const store = await readLocalStore();

  for (const input of validInputs) {
    const issueDate = normalizeDate(input.issueDate);
    const dueDate = normalizeDate(input.dueDate);

    if (!issueDate || !dueDate) {
      continue;
    }

    const paidDate = normalizeDate(input.paidDate);
    const now = new Date().toISOString();

    store.invoices.push({
      id: randomUUID(),
      clientName: input.clientName.trim(),
      clientEmail: sanitizeEmail(input.clientEmail),
      issueDate,
      dueDate,
      paidDate,
      amountCents: Math.max(0, Math.round(input.amountCents)),
      currency: (input.currency || "USD").toUpperCase(),
      status: normalizeStatus(input.status, paidDate),
      notes: input.notes?.trim() || null,
      createdAt: now,
      updatedAt: now
    });
  }

  await writeLocalStore(store);

  return validInputs.length;
}

export async function upsertSubscription(params: {
  email: string;
  status: SubscriptionStatus;
  source: string;
  lastEventId?: string | null;
  currentPeriodEnd?: string | null;
}): Promise<SubscriptionRecord> {
  const email = sanitizeEmail(params.email);

  if (!email) {
    throw new Error("Subscription email is required.");
  }

  const now = new Date().toISOString();

  if (shouldUsePostgres()) {
    await ensureSchema();

    const result = await getPool().query(
      `
      INSERT INTO subscriptions (
        id,
        email,
        status,
        source,
        last_event_id,
        current_period_end,
        created_at,
        updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (email)
      DO UPDATE SET
        status = EXCLUDED.status,
        source = EXCLUDED.source,
        last_event_id = EXCLUDED.last_event_id,
        current_period_end = EXCLUDED.current_period_end,
        updated_at = EXCLUDED.updated_at
      RETURNING id, email, status, source, last_event_id, current_period_end, created_at, updated_at
    `,
      [
        randomUUID(),
        email,
        params.status,
        params.source,
        params.lastEventId || null,
        params.currentPeriodEnd || null,
        now,
        now
      ]
    );

    return mapPgSubscription(result.rows[0]);
  }

  const store = await readLocalStore();
  const existing = store.subscriptions.find((record) => record.email === email);

  if (existing) {
    existing.status = params.status;
    existing.source = params.source;
    existing.lastEventId = params.lastEventId || null;
    existing.currentPeriodEnd = params.currentPeriodEnd || null;
    existing.updatedAt = now;
  } else {
    store.subscriptions.push({
      id: randomUUID(),
      email,
      status: params.status,
      source: params.source,
      lastEventId: params.lastEventId || null,
      currentPeriodEnd: params.currentPeriodEnd || null,
      createdAt: now,
      updatedAt: now
    });
  }

  await writeLocalStore(store);

  return store.subscriptions.find((record) => record.email === email) as SubscriptionRecord;
}

export async function getSubscriptionByEmail(emailInput: string): Promise<SubscriptionRecord | null> {
  const email = sanitizeEmail(emailInput);

  if (!email) {
    return null;
  }

  if (shouldUsePostgres()) {
    await ensureSchema();
    const result = await getPool().query(
      `
      SELECT
        id,
        email,
        status,
        source,
        last_event_id,
        current_period_end,
        created_at,
        updated_at
      FROM subscriptions
      WHERE email = $1
      LIMIT 1
    `,
      [email]
    );

    if (result.rowCount === 0) {
      return null;
    }

    return mapPgSubscription(result.rows[0]);
  }

  const store = await readLocalStore();
  return store.subscriptions.find((record) => record.email === email) || null;
}

export async function getActiveSubscriptionByEmail(email: string): Promise<SubscriptionRecord | null> {
  const subscription = await getSubscriptionByEmail(email);

  if (!subscription) {
    return null;
  }

  if (subscription.status !== "active") {
    return null;
  }

  return subscription;
}
