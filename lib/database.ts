import { addDays, format, subDays } from "date-fns";
import { Pool, type PoolClient } from "pg";

export type InvoiceStatus = "open" | "paid" | "overdue" | "void";

export interface InvoiceRecord {
  id: number;
  userId: string;
  externalId: string | null;
  clientName: string;
  amountCents: number;
  currency: string;
  issuedAt: string;
  dueAt: string;
  paidAt: string | null;
  status: InvoiceStatus;
  source: string;
  createdAt: string;
}

export interface NewInvoiceInput {
  externalId?: string | null;
  clientName: string;
  amountCents: number;
  currency?: string;
  issuedAt: string;
  dueAt: string;
  paidAt?: string | null;
  status?: InvoiceStatus;
  source?: string;
}

export interface AccessEventRecord {
  provider: "stripe" | "lemon_squeezy";
  eventKey: string;
  customerEmail: string | null;
  paid: boolean;
  metadata?: Record<string, unknown>;
}

interface InvoiceRowDb {
  id: number;
  user_id: string;
  external_id: string | null;
  client_name: string;
  amount_cents: number;
  currency: string;
  issued_at: string;
  due_at: string;
  paid_at: string | null;
  status: InvoiceStatus;
  source: string;
  created_at: string;
}

interface AccessRowDb {
  provider: "stripe" | "lemon_squeezy";
  event_key: string;
  customer_email: string | null;
  paid: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __ippPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __ippInitPromise: Promise<void> | undefined;
}

function dateToYMD(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function rowToInvoice(row: InvoiceRowDb): InvoiceRecord {
  return {
    id: row.id,
    userId: row.user_id,
    externalId: row.external_id,
    clientName: row.client_name,
    amountCents: row.amount_cents,
    currency: row.currency,
    issuedAt: String(row.issued_at).slice(0, 10),
    dueAt: String(row.due_at).slice(0, 10),
    paidAt: row.paid_at ? String(row.paid_at).slice(0, 10) : null,
    status: row.status,
    source: row.source,
    createdAt: row.created_at
  };
}

function getPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Add DATABASE_URL to your environment.");
  }

  if (!global.__ippPool) {
    const localConnection =
      connectionString.includes("localhost") ||
      connectionString.includes("127.0.0.1") ||
      connectionString.includes("sslmode=disable");

    global.__ippPool = new Pool({
      connectionString,
      ssl: localConnection ? false : { rejectUnauthorized: false }
    });
  }

  return global.__ippPool;
}

async function withClient<T>(operation: (client: PoolClient) => Promise<T>) {
  const client = await getPool().connect();
  try {
    return await operation(client);
  } finally {
    client.release();
  }
}

async function initializeDatabase() {
  if (!global.__ippInitPromise) {
    global.__ippInitPromise = withClient(async (client) => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS invoices (
          id BIGSERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          external_id TEXT,
          client_name TEXT NOT NULL,
          amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
          currency TEXT NOT NULL DEFAULT 'USD',
          issued_at DATE NOT NULL,
          due_at DATE NOT NULL,
          paid_at DATE,
          status TEXT NOT NULL DEFAULT 'open',
          source TEXT NOT NULL DEFAULT 'manual',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      await client.query(
        "CREATE INDEX IF NOT EXISTS idx_invoices_user_due_at ON invoices (user_id, due_at DESC);"
      );
      await client.query(
        "CREATE INDEX IF NOT EXISTS idx_invoices_user_client ON invoices (user_id, client_name);"
      );

      await client.query(`
        CREATE TABLE IF NOT EXISTS access_events (
          id BIGSERIAL PRIMARY KEY,
          provider TEXT NOT NULL,
          event_key TEXT NOT NULL,
          customer_email TEXT,
          paid BOOLEAN NOT NULL DEFAULT FALSE,
          metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(provider, event_key)
        );
      `);
    });
  }

  return global.__ippInitPromise;
}

export async function listInvoices(userId: string) {
  await initializeDatabase();

  const result = await getPool().query<InvoiceRowDb>(
    `
      SELECT
        id,
        user_id,
        external_id,
        client_name,
        amount_cents,
        currency,
        issued_at,
        due_at,
        paid_at,
        status,
        source,
        created_at
      FROM invoices
      WHERE user_id = $1
      ORDER BY due_at DESC, id DESC;
    `,
    [userId]
  );

  return result.rows.map(rowToInvoice);
}

export async function createInvoices(userId: string, invoices: NewInvoiceInput[]) {
  if (invoices.length === 0) {
    return 0;
  }

  await initializeDatabase();

  return withClient(async (client) => {
    await client.query("BEGIN");

    try {
      for (const invoice of invoices) {
        await client.query(
          `
            INSERT INTO invoices (
              user_id,
              external_id,
              client_name,
              amount_cents,
              currency,
              issued_at,
              due_at,
              paid_at,
              status,
              source
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
          `,
          [
            userId,
            invoice.externalId ?? null,
            invoice.clientName,
            invoice.amountCents,
            (invoice.currency || "USD").toUpperCase(),
            invoice.issuedAt,
            invoice.dueAt,
            invoice.paidAt ?? null,
            invoice.status ?? "open",
            invoice.source ?? "manual"
          ]
        );
      }

      await client.query("COMMIT");
      return invoices.length;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });
}

export async function seedInvoices(userId: string) {
  await initializeDatabase();

  const existing = await getPool().query<{ total: string }>(
    "SELECT COUNT(*)::text AS total FROM invoices WHERE user_id = $1",
    [userId]
  );

  if (Number(existing.rows[0]?.total ?? 0) > 0) {
    return 0;
  }

  const now = new Date();

  const seedData: NewInvoiceInput[] = [
    {
      clientName: "Blue Harbor Studio",
      amountCents: 185000,
      issuedAt: dateToYMD(subDays(now, 170)),
      dueAt: dateToYMD(subDays(now, 140)),
      paidAt: dateToYMD(subDays(now, 127)),
      status: "paid",
      source: "seed"
    },
    {
      clientName: "Blue Harbor Studio",
      amountCents: 220000,
      issuedAt: dateToYMD(subDays(now, 140)),
      dueAt: dateToYMD(subDays(now, 110)),
      paidAt: dateToYMD(subDays(now, 92)),
      status: "paid",
      source: "seed"
    },
    {
      clientName: "Blue Harbor Studio",
      amountCents: 260000,
      issuedAt: dateToYMD(subDays(now, 95)),
      dueAt: dateToYMD(subDays(now, 65)),
      paidAt: null,
      status: "overdue",
      source: "seed"
    },
    {
      clientName: "Northline Medical",
      amountCents: 480000,
      issuedAt: dateToYMD(subDays(now, 165)),
      dueAt: dateToYMD(subDays(now, 130)),
      paidAt: dateToYMD(subDays(now, 128)),
      status: "paid",
      source: "seed"
    },
    {
      clientName: "Northline Medical",
      amountCents: 520000,
      issuedAt: dateToYMD(subDays(now, 120)),
      dueAt: dateToYMD(subDays(now, 90)),
      paidAt: dateToYMD(subDays(now, 88)),
      status: "paid",
      source: "seed"
    },
    {
      clientName: "Northline Medical",
      amountCents: 550000,
      issuedAt: dateToYMD(subDays(now, 75)),
      dueAt: dateToYMD(subDays(now, 45)),
      paidAt: dateToYMD(subDays(now, 37)),
      status: "paid",
      source: "seed"
    },
    {
      clientName: "Beacon Retail Group",
      amountCents: 125000,
      issuedAt: dateToYMD(subDays(now, 175)),
      dueAt: dateToYMD(subDays(now, 145)),
      paidAt: dateToYMD(subDays(now, 131)),
      status: "paid",
      source: "seed"
    },
    {
      clientName: "Beacon Retail Group",
      amountCents: 132000,
      issuedAt: dateToYMD(subDays(now, 130)),
      dueAt: dateToYMD(subDays(now, 100)),
      paidAt: dateToYMD(subDays(now, 81)),
      status: "paid",
      source: "seed"
    },
    {
      clientName: "Beacon Retail Group",
      amountCents: 142000,
      issuedAt: dateToYMD(subDays(now, 90)),
      dueAt: dateToYMD(subDays(now, 60)),
      paidAt: null,
      status: "overdue",
      source: "seed"
    },
    {
      clientName: "Lumen Architecture",
      amountCents: 310000,
      issuedAt: dateToYMD(subDays(now, 110)),
      dueAt: dateToYMD(subDays(now, 80)),
      paidAt: dateToYMD(subDays(now, 74)),
      status: "paid",
      source: "seed"
    },
    {
      clientName: "Lumen Architecture",
      amountCents: 295000,
      issuedAt: dateToYMD(subDays(now, 55)),
      dueAt: dateToYMD(subDays(now, 25)),
      paidAt: null,
      status: "open",
      source: "seed"
    },
    {
      clientName: "Orbit Labs",
      amountCents: 640000,
      issuedAt: dateToYMD(subDays(now, 45)),
      dueAt: dateToYMD(subDays(now, 15)),
      paidAt: null,
      status: "overdue",
      source: "seed"
    },
    {
      clientName: "Orbit Labs",
      amountCents: 585000,
      issuedAt: dateToYMD(subDays(now, 16)),
      dueAt: dateToYMD(addDays(now, 14)),
      paidAt: null,
      status: "open",
      source: "seed"
    }
  ];

  return createInvoices(userId, seedData);
}

export async function upsertAccessEvent(event: AccessEventRecord) {
  await initializeDatabase();

  await getPool().query(
    `
      INSERT INTO access_events (provider, event_key, customer_email, paid, metadata)
      VALUES ($1, $2, $3, $4, $5::jsonb)
      ON CONFLICT(provider, event_key)
      DO UPDATE
      SET
        customer_email = EXCLUDED.customer_email,
        paid = EXCLUDED.paid,
        metadata = EXCLUDED.metadata,
        updated_at = NOW();
    `,
    [
      event.provider,
      event.eventKey,
      event.customerEmail,
      event.paid,
      JSON.stringify(event.metadata ?? {})
    ]
  );
}

export async function findPaidAccessEvent(provider: "stripe" | "lemon_squeezy", eventKey: string) {
  await initializeDatabase();

  const result = await getPool().query<AccessRowDb>(
    `
      SELECT provider, event_key, customer_email, paid, metadata, created_at, updated_at
      FROM access_events
      WHERE provider = $1 AND event_key = $2 AND paid = TRUE
      LIMIT 1;
    `,
    [provider, eventKey]
  );

  return result.rows[0] ?? null;
}
