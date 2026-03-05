import { Expense, Project, Show, TimelineEntry } from "@/lib/api";
import { apiJsonServer } from "@/lib/apiServer";

export default async function DashboardPage() {
  const [projects, shows, expenses, timeline] = await Promise.all([
    apiJsonServer<Project[]>("/projects"),
    apiJsonServer<Show[]>("/shows"),
    apiJsonServer<Expense[]>("/expenses"),
    apiJsonServer<TimelineEntry[]>("/projects/1/timeline").catch(() => [])
  ]);

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-white/10 bg-neutral-900 p-4">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
      </section>
      <section className="rounded-xl border border-white/10 bg-neutral-900 p-4">
        <h2 className="font-semibold text-red-300">Active projects</h2>
        {projects.filter((project) => project.status === "active").slice(0, 5).map((project) => <p key={project.id} className="text-sm">{project.name}</p>)}
      </section>
      <section className="rounded-xl border border-white/10 bg-neutral-900 p-4">
        <h2 className="font-semibold text-red-300">Upcoming shows</h2>
        {shows.slice(0, 5).map((show) => <p key={show.id} className="text-sm">{show.name} • {show.start_date.slice(0, 10)}</p>)}
      </section>
      <section className="rounded-xl border border-white/10 bg-neutral-900 p-4">
        <h2 className="font-semibold text-red-300">Recent timeline entries</h2>
        {timeline.slice(0, 5).map((item) => <p key={item.id} className="text-sm">{item.title} • {item.date.slice(0, 10)}</p>)}
      </section>
      <section className="rounded-xl border border-white/10 bg-neutral-900 p-4">
        <h2 className="font-semibold text-red-300">Recent expenses</h2>
        {expenses.slice(0, 5).map((expense) => <p key={expense.id} className="text-sm">{expense.date.slice(0, 10)} • ${expense.amount.toFixed(2)}</p>)}
      </section>
    </div>
  );
}
