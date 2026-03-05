import { SessionResponse } from "@/lib/api";
import { apiJsonServer } from "@/lib/apiServer";

export default async function DashboardPage() {
  const [session, summary] = await Promise.all([
    apiJsonServer<SessionResponse>("/session"),
    apiJsonServer<{ counts: Record<string, number>; month_total: number; by_project: { name: string; total: number }[] }>("/summary")
  ]);

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-white/10 bg-neutral-900 p-4">
        <p className="text-sm text-neutral-400">Welcome</p>
        <h1 className="text-2xl font-semibold">{session.active_profile?.name ?? "Project Barn"}</h1>
      </section>
      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {Object.entries(summary.counts).map(([key, value]) => (
          <article key={key} className="rounded-lg border border-white/10 bg-neutral-900 p-3">
            <p className="text-xs uppercase text-neutral-400">{key}</p>
            <p className="text-xl font-semibold">{value}</p>
          </article>
        ))}
      </section>
      <section className="rounded-xl border border-white/10 bg-neutral-900 p-4">
        <h2 className="font-semibold">Expense Summary</h2>
        <p className="mt-2 text-sm text-neutral-300">This month: ${summary.month_total.toFixed(2)}</p>
      </section>
    </div>
  );
}
