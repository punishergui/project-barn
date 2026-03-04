import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Project Barn",
  description: "Frontend migration shell for Project Barn"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
