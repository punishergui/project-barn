import { Toaster } from "sonner";

import AppShell from "@/components/AppShell";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      {children}
      <Toaster richColors position="top-center" />
    </AppShell>
  );
}
