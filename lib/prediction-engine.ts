import { differenceInCalendarDays, format, getDay, parseISO, startOfMonth, subMonths } from "date-fns";

import type { InvoiceRecord } from "@/lib/database";

export interface InvoicePrediction {
  invoiceId: number;
  clientName: string;
  amountCents: number;
  dueAt: string;
  riskScore: number;
  predictedDelayDays: number;
  daysOverdue: number;
  confidence: number;
  action: string;
  reason: string;
}

export interface PredictionSummary {
  totalOpenInvoices: number;
  atRiskInvoices: number;
  highRiskInvoices: number;
  estimatedDelayedRevenueCents: number;
  averagePredictedDelayDays: number;
}

export interface TimelinePoint {
  month: string;
  averageDelay: number;
  onTimeRate: number;
  paidInvoices: number;
}

interface LinearModel {
  slope: number;
  intercept: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundTo(number: number, precision = 1) {
  const factor = 10 ** precision;
  return Math.round(number * factor) / factor;
}

function getDelayDays(invoice: InvoiceRecord) {
  if (!invoice.paidAt) {
    return null;
  }

  return differenceInCalendarDays(parseISO(invoice.paidAt), parseISO(invoice.dueAt));
}

function fitLinearModel(xs: number[], ys: number[]): LinearModel {
  if (xs.length < 2 || ys.length < 2 || xs.length !== ys.length) {
    return { slope: 0, intercept: ys[0] ?? 0 };
  }

  const xMean = xs.reduce((sum, value) => sum + value, 0) / xs.length;
  const yMean = ys.reduce((sum, value) => sum + value, 0) / ys.length;

  let numerator = 0;
  let denominator = 0;

  for (let index = 0; index < xs.length; index += 1) {
    numerator += (xs[index] - xMean) * (ys[index] - yMean);
    denominator += (xs[index] - xMean) ** 2;
  }

  if (denominator === 0) {
    return { slope: 0, intercept: yMean };
  }

  const slope = numerator / denominator;
  const intercept = yMean - slope * xMean;

  return { slope, intercept };
}

function predictWithLinearModel(model: LinearModel, x: number) {
  return model.intercept + model.slope * x;
}

function actionForRisk(
  riskScore: number,
  daysOverdue: number,
  predictedDelayDays: number,
  amountCents: number
) {
  const amountDollars = amountCents / 100;

  if (daysOverdue >= 15 || riskScore >= 85) {
    return amountDollars >= 2500
      ? "Escalate now: call AP contact and request a same-week payment date"
      : "Send a firm final reminder and schedule a same-day follow-up call";
  }

  if (riskScore >= 70) {
    return amountDollars >= 2500
      ? "Send a personalized collection email with milestone-based payment options"
      : "Send a reminder with a 3-day deadline and auto-follow-up";
  }

  if (predictedDelayDays >= 5) {
    return "Queue a friendly reminder 5 days before due date and confirm invoice receipt";
  }

  return "Monitor only: keep standard reminder cadence";
}

export function generatePredictions(invoices: InvoiceRecord[]): InvoicePrediction[] {
  const today = new Date();

  const paidInvoices = invoices
    .map((invoice) => ({ invoice, delayDays: getDelayDays(invoice) }))
    .filter((entry): entry is { invoice: InvoiceRecord; delayDays: number } => entry.delayDays !== null);

  const openInvoices = invoices.filter((invoice) => !invoice.paidAt && invoice.status !== "void");

  if (openInvoices.length === 0) {
    return [];
  }

  const globalDelayAverage =
    paidInvoices.length > 0
      ? paidInvoices.reduce((sum, item) => sum + item.delayDays, 0) / paidInvoices.length
      : 4;

  const clientDelays = new Map<string, number[]>();
  const weekdayDelays = new Map<number, number[]>();

  for (const item of paidInvoices) {
    const clientKey = item.invoice.clientName.toLowerCase();
    const dueWeekday = getDay(parseISO(item.invoice.dueAt));

    if (!clientDelays.has(clientKey)) {
      clientDelays.set(clientKey, []);
    }
    clientDelays.get(clientKey)?.push(item.delayDays);

    if (!weekdayDelays.has(dueWeekday)) {
      weekdayDelays.set(dueWeekday, []);
    }
    weekdayDelays.get(dueWeekday)?.push(item.delayDays);
  }

  const amountXs: number[] = [];
  const delayYs: number[] = [];
  for (const item of paidInvoices) {
    amountXs.push(Math.log1p(item.invoice.amountCents / 100));
    delayYs.push(item.delayDays);
  }

  const amountModel = fitLinearModel(amountXs, delayYs);

  const getAverage = (values: number[] | undefined, fallback: number) => {
    if (!values || values.length === 0) {
      return fallback;
    }
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  };

  const predictions = openInvoices.map((invoice) => {
    const clientKey = invoice.clientName.toLowerCase();
    const dueDate = parseISO(invoice.dueAt);
    const dueWeekday = getDay(dueDate);

    const clientHistory = clientDelays.get(clientKey) ?? [];
    const clientAverage = getAverage(clientHistory, globalDelayAverage + 1.5);

    const weekdayAverage = getAverage(weekdayDelays.get(dueWeekday), globalDelayAverage);

    const amountSignal = predictWithLinearModel(amountModel, Math.log1p(invoice.amountCents / 100));

    const daysOverdue = Math.max(differenceInCalendarDays(today, dueDate), 0);

    const clientLateRate =
      clientHistory.length === 0
        ? 0.55
        : clientHistory.filter((delay) => delay > 0).length / clientHistory.length;

    const predictedDelayDays = Math.max(
      0,
      Math.round(
        clientAverage * 0.42 +
          weekdayAverage * 0.18 +
          amountSignal * 0.2 +
          daysOverdue * 0.65 +
          clientLateRate * 8
      )
    );

    const riskSignal = predictedDelayDays + daysOverdue * 0.8 + clientLateRate * 20;
    const riskScore = clamp(Math.round((1 / (1 + Math.exp(-(riskSignal - 11) / 6))) * 100), 5, 99);

    const confidence = clamp(
      Math.round(45 + Math.min(clientHistory.length, 10) * 4 + Math.min(paidInvoices.length, 40) * 0.6),
      48,
      96
    );

    const reason =
      clientHistory.length === 0
        ? "No prior history for this client, so model weights amount and current aging more heavily"
        : `Client paid ${Math.round(clientLateRate * 100)}% of previous invoices late with an average delay of ${roundTo(clientAverage, 1)} days`;

    return {
      invoiceId: invoice.id,
      clientName: invoice.clientName,
      amountCents: invoice.amountCents,
      dueAt: invoice.dueAt,
      riskScore,
      predictedDelayDays,
      daysOverdue,
      confidence,
      action: actionForRisk(riskScore, daysOverdue, predictedDelayDays, invoice.amountCents),
      reason
    } satisfies InvoicePrediction;
  });

  return predictions.sort((a, b) => b.riskScore - a.riskScore || b.amountCents - a.amountCents);
}

export function summarizePredictions(
  invoices: InvoiceRecord[],
  predictions: InvoicePrediction[]
): PredictionSummary {
  const atRisk = predictions.filter((prediction) => prediction.riskScore >= 70);
  const highRisk = predictions.filter((prediction) => prediction.riskScore >= 85);
  const delayedRevenue = atRisk.reduce((sum, prediction) => sum + prediction.amountCents, 0);

  const averagePredictedDelayDays =
    predictions.length === 0
      ? 0
      : roundTo(
          predictions.reduce((sum, prediction) => sum + prediction.predictedDelayDays, 0) /
            predictions.length,
          1
        );

  const openInvoices = invoices.filter((invoice) => !invoice.paidAt && invoice.status !== "void");

  return {
    totalOpenInvoices: openInvoices.length,
    atRiskInvoices: atRisk.length,
    highRiskInvoices: highRisk.length,
    estimatedDelayedRevenueCents: delayedRevenue,
    averagePredictedDelayDays
  };
}

export function buildTimeline(invoices: InvoiceRecord[]): TimelinePoint[] {
  const paidInvoices = invoices.filter((invoice) => invoice.paidAt);

  const monthWindows = Array.from({ length: 6 }, (_, index) => {
    const date = startOfMonth(subMonths(new Date(), 5 - index));
    const key = format(date, "MMM yyyy");
    return { date, key };
  });

  return monthWindows.map(({ date, key }) => {
    const relevant = paidInvoices.filter((invoice) => {
      const dueDate = parseISO(invoice.dueAt);
      return dueDate.getUTCFullYear() === date.getUTCFullYear() && dueDate.getUTCMonth() === date.getUTCMonth();
    });

    if (relevant.length === 0) {
      return {
        month: key,
        averageDelay: 0,
        onTimeRate: 0,
        paidInvoices: 0
      };
    }

    const delays = relevant
      .map((invoice) => getDelayDays(invoice))
      .filter((delay): delay is number => delay !== null);

    const averageDelay = delays.length === 0 ? 0 : delays.reduce((sum, value) => sum + value, 0) / delays.length;
    const onTime = delays.filter((delay) => delay <= 0).length;

    return {
      month: key,
      averageDelay: roundTo(averageDelay, 1),
      onTimeRate: roundTo((onTime / relevant.length) * 100, 1),
      paidInvoices: relevant.length
    };
  });
}
