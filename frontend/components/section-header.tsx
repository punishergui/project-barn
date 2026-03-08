import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function SectionHeader({
  title,
  href,
  count
}: {
  title: string;
  href?: string;
  count?: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <h2 className="font-serif text-lg text-foreground">{title}</h2>
        {count !== undefined ? (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1.5 font-mono text-[10px] text-muted-foreground">{count}</span>
        ) : null}
      </div>
      {href ? (
        <Link href={href} className="flex items-center gap-0.5 text-xs font-medium text-primary hover:underline">
          View all
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  );
}
