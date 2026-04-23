export type InvoiceStatus = "PAID" | "UNPAID";

export interface InvoiceRecord {
  id: string;
  clientName: string;
  clientEmail: string | null;
  issueDate: string;
  dueDate: string;
  paidDate: string | null;
  amountCents: number;
  currency: string;
  status: InvoiceStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceInput {
  clientName: string;
  clientEmail?: string | null;
  issueDate: string;
  dueDate: string;
  paidDate?: string | null;
  amountCents: number;
  currency?: string;
  status?: InvoiceStatus;
  notes?: string | null;
}

export type SubscriptionStatus = "active" | "past_due" | "canceled";

export interface SubscriptionRecord {
  id: string;
  email: string;
  status: SubscriptionStatus;
  source: string;
  lastEventId: string | null;
  currentPeriodEnd: string | null;
  createdAt: string;
  updatedAt: string;
}
