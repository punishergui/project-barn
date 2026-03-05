import type { Metadata } from "next";

import AppShell from "@/components/AppShell";
import PwaClient from "@/components/PwaClient";

import "./globals.css";

export const metadata: Metadata = {
  title: "Project Barn",
  description: "Family livestock tracker",
  manifest: "/manifest.webmanifest"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppShell><PwaClient />{children}</AppShell>
      </body>
    </html>
  );
}
