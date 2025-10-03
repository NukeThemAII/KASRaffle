import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

import { Providers } from "@/components/providers";

const font = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "KASRaffle",
  description: "Time-boxed raffles on Kasplex (Kaspa L2 EVM)"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${font.className} bg-slate-950 text-slate-100 min-h-screen`}> 
        <Providers>
          <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
