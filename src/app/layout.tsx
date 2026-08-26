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
  metadataBase: new URL("https://creditpass.druxamb.dev"),
  title: "CreditPass | Cross-Chain Credit Passport",
  description: "Your repayment history on Ethereum is your credit score on Creditcoin — verified cryptographically via the Attestcoin Protocol. No oracle, no intermediary.",
  icons: {
    icon: "/favicon.ico",
    apple: "/logo.png",
  },
  openGraph: {
    title: "CreditPass | Cross-Chain Credit Passport",
    description: "Your repayment history on Ethereum is your credit score on Creditcoin — verified cryptographically via the Attestcoin Protocol.",
    type: "website",
    url: "https://creditpass.druxamb.dev/",
    images: [{ url: "/logo.png", width: 480, height: 480, alt: "CreditPass" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CreditPass | Cross-Chain Credit Passport",
    description: "Your repayment history on Ethereum is your credit score on Creditcoin — verified via the Attestcoin Protocol.",
    images: ["/logo.png"],
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
