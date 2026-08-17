import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CreditPass — Cross-Chain Credit Passport",
  description: "Your repayment history on Ethereum is your credit score on Creditcoin — verified cryptographically via the Attestcoin Protocol. No oracle, no intermediary.",
  openGraph: {
    title: "CreditPass — Cross-Chain Credit Passport",
    description: "Your repayment history on Ethereum is your credit score on Creditcoin — verified cryptographically via the Attestcoin Protocol.",
    type: "website",
    url: "https://creditpass-mauve.vercel.app",
  },
  twitter: {
    card: "summary_large_image",
    title: "CreditPass — Cross-Chain Credit Passport",
    description: "Your repayment history on Ethereum is your credit score on Creditcoin — verified via the Attestcoin Protocol.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground"><Providers>{children}</Providers></body>
    </html>
  );
}
