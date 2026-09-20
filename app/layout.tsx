import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ReconAI — Smart Bank Reconciliation",
  description:
    "AI-powered bank reconciliation that matches transactions, detects anomalies, and forecasts cash flow. Built for business owners and bookkeepers.",
  keywords: ["bank reconciliation", "AI", "bookkeeping", "cash flow", "SMB"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable}`}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <head>
        {/* Prevent FOUC on theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const stored = localStorage.getItem('reconai-theme');
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                const theme = stored || (prefersDark ? 'dark' : 'light');
                document.documentElement.setAttribute('data-theme', theme);
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
