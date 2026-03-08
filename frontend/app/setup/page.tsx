import Link from "next/link";

export default function SetupPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-lg bg-background px-4 py-8">
      <section className="mb-4 rounded-2xl border border-border bg-card p-5">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Project Barn Setup</p>
        <h1 className="mt-1 font-serif text-2xl text-foreground">Get your family ready in under 5 minutes</h1>
        <p className="mt-1 text-sm text-muted-foreground">Complete these steps in order for the smoothest first run on mobile.</p>
      </section>

      <section className="mb-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-1 text-sm font-semibold text-foreground">Step 1: Confirm profile</h2>
        <p className="mb-3 text-sm text-muted-foreground">Use profile picker to switch to the right parent or kid account.</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/profile-picker" className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Open profile picker</Link>
        </div>
      </section>

      <section className="mb-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-1 text-sm font-semibold text-foreground">Step 2: Add your first project</h2>
        <p className="mb-3 text-sm text-muted-foreground">Create an animal or non-livestock project. This unlocks expenses, feed logs, shows, and reminders.</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/projects/new" className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Create project</Link>
          <Link href="/projects" className="rounded-xl bg-secondary px-4 py-2 text-sm text-foreground">View projects</Link>
        </div>
      </section>

      <section className="mb-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-1 text-sm font-semibold text-foreground">Step 3: Log a first expense or feed entry</h2>
        <p className="mb-3 text-sm text-muted-foreground">Tracking one real activity makes the dashboard and reports immediately useful.</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/expenses/new" className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Add expense</Link>
          <Link href="/feed" className="rounded-xl bg-secondary px-4 py-2 text-sm text-foreground">Log feed</Link>
        </div>
      </section>

      <section className="mb-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-1 text-sm font-semibold text-foreground">You are ready</h2>
        <p className="mb-3 text-sm text-muted-foreground">Head to your dashboard for quick actions, reminders, and active project cards.</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard" className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Go to dashboard</Link>
        </div>
      </section>
    </main>
  );
}
