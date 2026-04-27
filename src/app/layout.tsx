import type { Metadata } from "next";
import { Geist_Mono, Public_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";

// ── Healthcare Compliance Typography (USWDS Federal Standard) ──
// Public Sans: USWDS official sans-serif (used by healthcare.gov, Medicare.gov, CMS)
// Source Serif 4: USWDS official serif companion (editorial moments, hero titles)
const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Learning Hub — SecureCare Training",
  description: "Professional learning management for healthcare organizations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${publicSans.variable} ${sourceSerif.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full">{children}</body>
    </html>
  );
}
