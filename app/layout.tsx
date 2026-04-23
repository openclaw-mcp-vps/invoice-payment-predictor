import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import type { ReactNode } from "react";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk"
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono"
});

export const metadata: Metadata = {
  title: {
    default: "Invoice Payment Predictor",
    template: "%s | Invoice Payment Predictor"
  },
  description:
    "Predict which invoices are likely to be paid late, prioritize collection actions, and protect cash flow before delays hurt your business.",
  openGraph: {
    title: "Invoice Payment Predictor",
    description:
      "Identify late-payment risk from real invoice history and act early with practical collection recommendations.",
    type: "website",
    url: "https://invoice-payment-predictor.app"
  },
  twitter: {
    card: "summary_large_image",
    title: "Invoice Payment Predictor",
    description:
      "Predict late invoices, improve collection timing, and stabilize cash flow for freelancers and agencies."
  },
  metadataBase: new URL("https://invoice-payment-predictor.app")
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${ibmPlexMono.variable}`}>
      <body className="min-h-screen bg-[#0d1117] text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
