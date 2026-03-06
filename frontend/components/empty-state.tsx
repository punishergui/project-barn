import Link from "next/link";

type EmptyStateAction = {
  href: string;
  label: string;
  variant?: "primary" | "secondary";
};

type EmptyStateProps = {
  icon?: string;
  title: string;
  description: string;
  actions?: EmptyStateAction[];
};

export default function EmptyState({ icon = "🐑", title, description, actions = [] }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--barn-border)] bg-[color-mix(in_srgb,var(--barn-surface)_85%,black)] px-4 py-5 text-center">
      <p className="text-2xl" aria-hidden="true">{icon}</p>
      <h3 className="mt-2 text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-[var(--barn-muted)]">{description}</p>
      {actions.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {actions.map((action) => (
            <Link
              key={`${action.href}:${action.label}`}
              href={action.href}
              className={action.variant === "secondary"
                ? "rounded-lg border border-[var(--barn-border)] bg-[var(--barn-bg)] px-3 py-2 text-xs font-medium"
                : "rounded-lg bg-[var(--barn-red)] px-3 py-2 text-xs font-semibold text-white"
              }
            >
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
