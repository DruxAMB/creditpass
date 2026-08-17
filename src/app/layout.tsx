import type { Metadata } from "next";
import { Barlow_Condensed, Cormorant_Garamond, Space_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-gt-alpina-condensed",
  subsets: ["latin"],
  weight: ["300", "400"],
});

const spaceMono = Space_Mono({
  variable: "--font-atlas-typewriter",
  subsets: ["latin"],
  weight: ["400", "700"],
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
      className={`${barlowCondensed.variable} ${cormorantGaramond.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper-white text-ink-black">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
