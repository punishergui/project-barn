"use client";

import { usePathname } from "next/navigation";

import AppShell from "@/components/AppShell";

const shellHiddenMatchers = [
  /^\/profile-picker$/,
  /^\/login(?:\/|$)/,
  /^\/auth(?:\/|$)/,
  /^\/setup(?:\/|$)/
];

export default function RootShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showShell = !shellHiddenMatchers.some((matcher) => matcher.test(pathname));

  return <AppShell showShell={showShell}>{children}</AppShell>;
}
