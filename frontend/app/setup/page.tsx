import Link from "next/link";

export default function SetupPage() {
  return (
    <main className="mx-auto w-full max-w-xl space-y-4 px-4 py-8">
      <section className="rounded-2xl border border-[var(--barn-border)] bg-gradient-to-br from-[var(--barn-red)]/20 to-[var(--barn-surface)] p-5">
        <p className="text-xs uppercase tracking-wide text-[var(--barn-muted)]">Project Barn setup</p>
        <h1 className="mt-2 text-2xl font-semibold">Get your family ready in under 5 minutes</h1>
        <p className="mt-2 text-sm text-[var(--barn-muted)]">Complete these steps in order for the smoothest first run on mobile.</p>
      </section>

      <section className="barn-card space-y-3 text-sm">
        <h2 className="text-base font-semibold">Step 1: Confirm profile</h2>
        <p className="text-[var(--barn-muted)]">Use profile picker to switch to the right parent or kid account.</p>
        <Link href="/profile-picker" className="inline-flex rounded-lg bg-[var(--barn-red)] px-3 py-2 text-xs font-semibold">Open profile picker</Link>
      </section>

      <section className="barn-card space-y-3 text-sm">
        <h2 className="text-base font-semibold">Step 2: Add your first project</h2>
        <p className="text-[var(--barn-muted)]">Create an animal or non-livestock project. This unlocks expenses, feed logs, shows, and reminders.</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/projects/new" className="rounded-lg bg-[var(--barn-red)] px-3 py-2 text-xs font-semibold">Create project</Link>
          <Link href="/projects" className="rounded-lg border border-[var(--barn-border)] bg-[var(--barn-bg)] px-3 py-2 text-xs">View projects</Link>
        </div>
      </section>

      <section className="barn-card space-y-3 text-sm">
        <h2 className="text-base font-semibold">Step 3: Log a first expense or feed entry</h2>
        <p className="text-[var(--barn-muted)]">Tracking one real activity makes the dashboard and reports immediately useful.</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/expenses/new" className="rounded-lg bg-[var(--barn-red)] px-3 py-2 text-xs font-semibold">Add expense</Link>
          <Link href="/feed" className="rounded-lg border border-[var(--barn-border)] bg-[var(--barn-bg)] px-3 py-2 text-xs">Log feed</Link>
        </div>
      </section>

      <section className="barn-card space-y-2 text-sm">
        <h2 className="text-base font-semibold">You are ready</h2>
        <p className="text-[var(--barn-muted)]">Head to your dashboard for quick actions, reminders, and active project cards.</p>
        <Link href="/dashboard" className="inline-flex rounded-lg bg-[var(--barn-red)] px-3 py-2 text-xs font-semibold">Go to dashboard</Link>
      </section>
    </main>
  );
}
