import Link from "next/link";

export default function ShellNotFoundPage() {
  return (
    <section className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center px-6 py-10 text-center">
      <p className="text-sm uppercase tracking-[0.2em] text-[color-mix(in_srgb,var(--barn-text)_55%,transparent)]">404</p>
      <h1 className="mt-2 text-2xl font-semibold">Page not found</h1>
      <p className="mt-3 max-w-md text-sm text-[color-mix(in_srgb,var(--barn-text)_70%,transparent)]">
        The page you requested does not exist or may have been moved.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex min-h-11 items-center rounded-lg bg-[var(--barn-red)] px-4 py-2 text-sm font-medium text-white"
        >
          Go to dashboard
        </Link>
        <Link
          href="/more"
          className="inline-flex min-h-11 items-center rounded-lg border border-[var(--barn-border)] px-4 py-2 text-sm"
        >
          Open more
        </Link>
      </div>
    </section>
  );
}
