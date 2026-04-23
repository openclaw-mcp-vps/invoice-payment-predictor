import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";

import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL("https://invoice-payment-predictor.app"),
  title: {
    default: "Invoice Payment Predictor",
    template: "%s | Invoice Payment Predictor"
  },
  description:
    "Predict which invoices will be paid late using payment-pattern analysis, then take the right collection action before cash flow gets squeezed.",
  keywords: [
    "invoice payment predictor",
    "late invoice prediction",
    "accounts receivable analytics",
    "cash flow forecasting",
    "freelancer invoicing"
  ],
  openGraph: {
    title: "Invoice Payment Predictor",
    description:
      "Analyze client payment behavior, forecast delays, and prioritize collection action before invoices slip.",
    url: "https://invoice-payment-predictor.app",
    siteName: "Invoice Payment Predictor",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Invoice Payment Predictor",
    description:
      "Predict late payments, protect cash flow, and collect smarter with a risk-first dashboard."
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${spaceGrotesk.className} antialiased`}>{children}</body>
    </html>
  );
}
