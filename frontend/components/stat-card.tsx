import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  className
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-1 rounded-xl border border-border bg-card px-2 py-3", className)}>
      {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
      <span className="font-serif text-xl text-foreground">{value}</span>
      <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
    </div>
  );
}
