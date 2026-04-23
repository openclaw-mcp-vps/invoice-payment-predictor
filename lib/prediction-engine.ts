import { compareAsc, differenceInCalendarDays, parseISO, startOfDay } from "date-fns";
import type { InvoiceRecord } from "@/lib/types";

export interface PredictionResult {
  invoiceId: string;
  clientName: string;
  clientEmail: string | null;
  amountCents: number;
  currency: string;
  dueDate: string;
  issueDate: string;
  riskScore: number;
  riskBand: "low" | "medium" | "high";
  predictedLate: boolean;
  recommendedAction: string;
  actionPriority: "watch" | "follow_up" | "urgent";
  drivers: string[];
  daysUntilDue: number;
  daysPastDue: number;
}

export interface PredictionSummary {
  openInvoices: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  totalOpenAmountCents: number;
  expectedLateCashCents: number;
  highRiskExposureCents: number;
  averageRiskScore: number;
}

export interface PaymentPatternChartDatum {
  client: string;
  onTime: number;
  late: number;
  open: number;
}

export interface PredictionDashboardData {
  predictions: PredictionResult[];
  summary: PredictionSummary;
  chartData: PaymentPatternChartDatum[];
}

interface ClientHistory {
  paidCount: number;
  lateCount: number;
  averageDelayDays: number;
  averageAmountCents: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function toClientKey(invoice: InvoiceRecord) {
  const byEmail = invoice.clientEmail?.trim().toLowerCase();
  if (byEmail) {
    return byEmail;
  }

  return invoice.clientName.trim().toLowerCase();
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getRiskBand(score: number): PredictionResult["riskBand"] {
  if (score >= 70) {
    return "high";
  }

  if (score >= 45) {
    return "medium";
  }

  return "low";
}

function getAction(score: number, daysPastDue: number, daysUntilDue: number): Pick<
  PredictionResult,
  "recommendedAction" | "actionPriority"
> {
  if (score >= 80 && daysPastDue > 0) {
    return {
      actionPriority: "urgent",
      recommendedAction:
        "Call accounts payable today, confirm a specific payment date, and pause additional scope until payment lands."
    };
  }

  if (score >= 70) {
    return {
      actionPriority: "urgent",
      recommendedAction:
        "Send a firm reminder now with invoice copy and payment link, then schedule a follow-up call within 48 hours."
    };
  }

  if (score >= 50 && daysPastDue >= 7) {
    return {
      actionPriority: "follow_up",
      recommendedAction:
        "Escalate with a second reminder that references your payment terms and asks for written confirmation of the transfer date."
    };
  }

  if (score >= 50) {
    return {
      actionPriority: "follow_up",
      recommendedAction:
        "Queue reminders for due date, +3 days, and +7 days with clear next steps and payment options."
    };
  }

  if (daysUntilDue <= 3 && daysUntilDue >= 0) {
    return {
      actionPriority: "watch",
      recommendedAction:
        "Send a friendly pre-due reminder to reduce the chance of an avoidable delay."
    };
  }

  return {
    actionPriority: "watch",
    recommendedAction: "No immediate action needed. Keep automated reminder cadence in place."
  };
}

function buildDrivers(params: {
  lateRatio: number;
  averageDelayDays: number;
  daysPastDue: number;
  amountFactor: number;
  clientPaidCount: number;
}) {
  const drivers: string[] = [];

  if (params.clientPaidCount > 0) {
    drivers.push(
      `Client has paid ${Math.round(params.lateRatio * 100)}% of prior invoices late across ${params.clientPaidCount} paid invoices.`
    );

    if (params.averageDelayDays > 0) {
      drivers.push(`Average delay for this client is ${params.averageDelayDays.toFixed(1)} days.`);
    }
  } else {
    drivers.push("No client-specific payment history yet; score is based on account-level behavior.");
  }

  if (params.daysPastDue > 0) {
    drivers.push(`Invoice is already ${params.daysPastDue} days past due.`);
  }

  if (params.amountFactor > 0.25) {
    drivers.push("Invoice amount is larger than the client's typical invoice, which increases delay risk.");
  }

  return drivers.slice(0, 3);
}

export function generatePredictions(invoices: InvoiceRecord[]): PredictionDashboardData {
  const today = startOfDay(new Date());
  const groupedHistory = new Map<string, InvoiceRecord[]>();

  for (const invoice of invoices) {
    const key = toClientKey(invoice);
    const existing = groupedHistory.get(key) || [];
    existing.push(invoice);
    groupedHistory.set(key, existing);
  }

  const allPaid = invoices.filter((invoice) => invoice.status === "PAID" && invoice.paidDate);
  const allPaidDelays = allPaid.map((invoice) => {
    const dueDate = parseISO(invoice.dueDate);
    const paidDate = parseISO(invoice.paidDate as string);
    return Math.max(0, differenceInCalendarDays(paidDate, dueDate));
  });
  const globalLateRatio = allPaid.length === 0 ? 0.35 : allPaidDelays.filter((delay) => delay > 0).length / allPaid.length;
  const globalAverageDelay = average(allPaidDelays);

  const averageAmountCents =
    invoices.length === 0
      ? 0
      : invoices.reduce((sum, invoice) => sum + invoice.amountCents, 0) / Math.max(1, invoices.length);

  const clientHistory = new Map<string, ClientHistory>();

  for (const [clientKey, clientInvoices] of groupedHistory) {
    const paidInvoices = clientInvoices.filter((invoice) => invoice.status === "PAID" && invoice.paidDate);
    const delays = paidInvoices.map((invoice) => {
      const dueDate = parseISO(invoice.dueDate);
      const paidDate = parseISO(invoice.paidDate as string);
      return Math.max(0, differenceInCalendarDays(paidDate, dueDate));
    });

    clientHistory.set(clientKey, {
      paidCount: paidInvoices.length,
      lateCount: delays.filter((delay) => delay > 0).length,
      averageDelayDays: average(delays),
      averageAmountCents:
        clientInvoices.reduce((sum, invoice) => sum + invoice.amountCents, 0) / Math.max(1, clientInvoices.length)
    });
  }

  const openInvoices = invoices.filter((invoice) => invoice.status === "UNPAID");

  const predictions = openInvoices
    .map<PredictionResult>((invoice) => {
      const key = toClientKey(invoice);
      const history = clientHistory.get(key);
      const paidCount = history?.paidCount || 0;
      const lateRatio =
        paidCount > 0 ? (history?.lateCount || 0) / Math.max(1, paidCount) : clamp(globalLateRatio, 0.15, 0.9);
      const avgDelay = paidCount > 0 ? history?.averageDelayDays || 0 : globalAverageDelay;

      const dueDate = parseISO(invoice.dueDate);
      const daysUntilDue = differenceInCalendarDays(dueDate, today);
      const daysPastDue = Math.max(0, -daysUntilDue);

      const baselineAmount = history?.averageAmountCents || averageAmountCents || invoice.amountCents;
      const amountRelative = baselineAmount === 0 ? 1 : invoice.amountCents / baselineAmount;
      const amountFactor = clamp((amountRelative - 1) / 1.5, 0, 1);

      const delayFactor = clamp(avgDelay / 35, 0, 1);
      const overdueFactor = clamp(daysPastDue / 40, 0, 1);
      const dueSoonFactor = daysUntilDue >= 0 && daysUntilDue <= 7 ? (8 - daysUntilDue) / 8 : 0;
      const confidencePenalty = clamp((4 - paidCount) / 10, 0, 0.1);

      let probability =
        0.12 +
        lateRatio * 0.33 +
        delayFactor * 0.18 +
        amountFactor * 0.14 +
        overdueFactor * 0.18 +
        dueSoonFactor * 0.05 +
        confidencePenalty;

      if (daysPastDue > 14) {
        probability += 0.08;
      }

      if (daysPastDue > 30) {
        probability += 0.06;
      }

      probability = clamp(probability, 0.03, 0.98);
      const riskScore = Math.round(probability * 100);
      const riskBand = getRiskBand(riskScore);
      const action = getAction(riskScore, daysPastDue, daysUntilDue);

      return {
        invoiceId: invoice.id,
        clientName: invoice.clientName,
        clientEmail: invoice.clientEmail,
        amountCents: invoice.amountCents,
        currency: invoice.currency,
        dueDate: invoice.dueDate,
        issueDate: invoice.issueDate,
        riskScore,
        riskBand,
        predictedLate: riskScore >= 55,
        recommendedAction: action.recommendedAction,
        actionPriority: action.actionPriority,
        drivers: buildDrivers({
          lateRatio,
          averageDelayDays: avgDelay,
          daysPastDue,
          amountFactor,
          clientPaidCount: paidCount
        }),
        daysUntilDue,
        daysPastDue
      };
    })
    .sort((a, b) => {
      if (b.riskScore !== a.riskScore) {
        return b.riskScore - a.riskScore;
      }

      return compareAsc(parseISO(a.dueDate), parseISO(b.dueDate));
    });

  const summary: PredictionSummary = {
    openInvoices: predictions.length,
    highRiskCount: predictions.filter((prediction) => prediction.riskBand === "high").length,
    mediumRiskCount: predictions.filter((prediction) => prediction.riskBand === "medium").length,
    lowRiskCount: predictions.filter((prediction) => prediction.riskBand === "low").length,
    totalOpenAmountCents: predictions.reduce((sum, prediction) => sum + prediction.amountCents, 0),
    expectedLateCashCents: Math.round(
      predictions.reduce((sum, prediction) => sum + prediction.amountCents * (prediction.riskScore / 100), 0)
    ),
    highRiskExposureCents: predictions
      .filter((prediction) => prediction.riskBand === "high")
      .reduce((sum, prediction) => sum + prediction.amountCents, 0),
    averageRiskScore:
      predictions.length === 0
        ? 0
        : Math.round(predictions.reduce((sum, prediction) => sum + prediction.riskScore, 0) / predictions.length)
  };

  const chartData: PaymentPatternChartDatum[] = Array.from(groupedHistory.entries())
    .map(([_, clientInvoices]) => {
      const label = clientInvoices[0]?.clientName || "Unknown";
      const onTime = clientInvoices.filter((invoice) => {
        if (invoice.status !== "PAID" || !invoice.paidDate) {
          return false;
        }

        return differenceInCalendarDays(parseISO(invoice.paidDate), parseISO(invoice.dueDate)) <= 0;
      }).length;
      const late = clientInvoices.filter((invoice) => {
        if (invoice.status !== "PAID" || !invoice.paidDate) {
          return false;
        }

        return differenceInCalendarDays(parseISO(invoice.paidDate), parseISO(invoice.dueDate)) > 0;
      }).length;
      const open = clientInvoices.filter((invoice) => invoice.status === "UNPAID").length;

      return {
        client: label,
        onTime,
        late,
        open
      };
    })
    .sort((a, b) => b.late + b.open - (a.late + a.open))
    .slice(0, 8);

  return {
    predictions,
    summary,
    chartData
  };
}
