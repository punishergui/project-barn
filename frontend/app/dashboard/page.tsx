import Link from "next/link";

import { getDashboard, getSession } from "@/lib/api";

export default async function DashboardPage() {
  const [session, dashboard] = await Promise.all([getSession(), getDashboard()]);

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-slate-100 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl">
          <p className="text-sm text-slate-400">Welcome back</p>
          <h1 className="text-3xl font-semibold">{session.active_profile.name ?? "Project Barn"}</h1>
          <p className="mt-2 text-sm text-slate-300">Your barn snapshot is live from the Flask API.</p>
          <div className="mt-4 flex gap-3">
            <Link href="/projects" className="rounded-xl bg-emerald-500 px-4 py-2 font-medium text-slate-950">
              View projects
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {Object.entries(dashboard.counts).map(([key, value]) => (
            <article key={key} className="rounded-2xl border border-white/10 bg-slate-900 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">{key}</p>
              <p className="mt-2 text-2xl font-semibold">{value}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-white/10 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold">Recent activity</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              {dashboard.recent_activity.map((item, index) => (
                <li key={`${item.kind}-${index}`} className="rounded-xl bg-slate-800/70 p-3">
                  <p className="font-medium text-slate-100">{item.label}</p>
                  <p className="text-xs text-slate-400">{item.date ? new Date(item.date).toLocaleDateString() : "No date"}</p>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-2xl border border-white/10 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold">Upcoming</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              {dashboard.upcoming.map((item, index) => (
                <li key={`${item.kind}-${index}`} className="rounded-xl bg-slate-800/70 p-3">
                  <p className="font-medium text-slate-100">{item.label}</p>
                  <p className="text-xs text-slate-400">{item.date ? new Date(item.date).toLocaleDateString() : "TBD"}</p>
                </li>
              ))}
              {dashboard.upcoming.length === 0 ? <li className="text-slate-400">No upcoming events.</li> : null}
            </ul>
          </article>
        </section>
      </div>
    </main>
  );
}
