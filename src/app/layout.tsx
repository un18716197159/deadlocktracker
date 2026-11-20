import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./heroes/heroes.css";
import "./items/items.css";
import "./leaderboards/leaderboards.css";
import "./visual-system.css";
import "./shell.css";
import "./polish.css";
import "./theme.css";
import "./flat.css";
import { siteUrl } from "@/lib/site";
import { I18nProvider } from "@/lib/i18n/provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: "Deadlock Tracker",
  description: "Deadlock match analytics and meta intelligence.",
  openGraph: { type: "website", siteName: "Deadlock Tracker" },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><I18nProvider>{children}</I18nProvider></body>
    </html>
  );
}

