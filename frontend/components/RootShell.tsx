"use client";

import AppShell from "@/components/AppShell";

export default function RootShell({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
