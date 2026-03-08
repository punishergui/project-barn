import type { Metadata } from "next";
import { DM_Serif_Display, Geist_Mono, Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";

import PwaClient from "@/components/PwaClient";

import "./globals.css";

export const metadata: Metadata = {
  title: "Project Barn",
  description: "Family livestock tracker",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-512.png"
  }
};

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans"
});

const dmSerif = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-serif"
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono"
});

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSerif.variable} ${geistMono.variable}`}>
      <body className="bg-background font-sans text-foreground antialiased">
        <PwaClient />
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
