import Link from "next/link";

import { Expense, Profile, Project, Show, TimelineEntry } from "@/lib/api";
import { apiJsonServer } from "@/lib/apiServer";

function bestPlacingFromShows(shows: Show[], projectId: number) {
  const values = shows
    .flatMap((show) => show.entries)
    .filter((entry) => entry.project_id === projectId)
    .flatMap((entry) => entry.placings)
    .map((placing) => Number.parseInt(String(placing.placing), 10))
    .filter((value) => Number.isFinite(value));

  if (values.length === 0) {
    return "N/A";
  }

  return `#${Math.min(...values)}`;
}

export default async function DashboardPage() {
  const [projects, shows, expenses, profiles] = await Promise.all([
    apiJsonServer<Project[]>("/projects"),
    apiJsonServer<Show[]>("/shows"),
    apiJsonServer<Expense[]>("/expenses"),
    apiJsonServer<Profile[]>("/profiles")
  ]);

  const activeProjects = projects.filter((project) => project.status === "active");
  const ownerMap = new Map(profiles.map((profile) => [profile.id, profile.name]));
  const upcomingShows = [...shows]
    .filter((show) => new Date(show.start_date).getTime() >= new Date().setHours(0, 0, 0, 0))
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
    .slice(0, 6);
  const recentExpenses = expenses.slice(0, 6);

  const timelines = await Promise.all(
    activeProjects.slice(0, 6).map((project) => apiJsonServer<TimelineEntry[]>(`/projects/${project.id}/timeline`).catch(() => []))
  );
  const recentTimeline = timelines
    .flat()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-6 pb-3 pt-2">
      <section className="rounded-xl border border-white/10 bg-neutral-900 p-4">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-neutral-300">At-a-glance view of your family projects, shows, expenses, and activity.</p>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Active Projects</h2>
          <Link href="/projects" className="text-sm text-red-300">View all</Link>
        </div>
        {activeProjects.length === 0 ? <p className="rounded-xl border border-white/10 bg-neutral-900 p-4 text-sm text-neutral-300">No projects yet. Add your first project to get started.</p> : null}
        <div className="grid gap-3 md:grid-cols-2">
          {activeProjects.slice(0, 6).map((project) => {
            const projectExpenses = expenses.filter((expense) => expense.allocations.some((row) => row.project_id === project.id));
            const totalExpenses = projectExpenses.reduce(
              (sum, expense) => sum + expense.allocations.filter((row) => row.project_id === project.id).reduce((inner, row) => inner + row.amount, 0),
              0
            );
            const showsEntered = shows.reduce((sum, show) => sum + show.entries.filter((entry) => entry.project_id === project.id).length, 0);
            return (
              <Link key={project.id} href={`/projects/${project.id}`} className="rounded-xl border border-white/10 bg-neutral-900 p-4">
                <p className="text-lg font-semibold">{project.name}</p>
                <p className="text-sm text-neutral-300">{project.species}</p>
                <p className="mt-1 text-sm text-neutral-300">Owner: {ownerMap.get(project.owner_profile_id) ?? "Unknown"}</p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-neutral-200">
                  <div className="rounded bg-neutral-800 p-2">${totalExpenses.toFixed(2)} spent</div>
                  <div className="rounded bg-neutral-800 p-2">{showsEntered} shows</div>
                  <div className="rounded bg-neutral-800 p-2">Best {bestPlacingFromShows(shows, project.id)}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Upcoming Shows</h2>
          <Link href="/shows" className="text-sm text-red-300">View all</Link>
        </div>
        {upcomingShows.length === 0 ? <p className="rounded-xl border border-white/10 bg-neutral-900 p-4 text-sm text-neutral-300">No upcoming shows scheduled.</p> : null}
        <div className="grid gap-3 md:grid-cols-2">
          {upcomingShows.map((show) => (
            <Link key={show.id} href={`/shows/${show.id}`} className="rounded-xl border border-white/10 bg-neutral-900 p-4">
              <p className="font-semibold">{show.name}</p>
              <p className="text-sm text-neutral-300">{show.location}</p>
              <p className="mt-2 text-sm text-neutral-200">{show.start_date.slice(0, 10)}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Expenses</h2>
          <Link href="/expenses" className="text-sm text-red-300">View all</Link>
        </div>
        {recentExpenses.length === 0 ? <p className="rounded-xl border border-white/10 bg-neutral-900 p-4 text-sm text-neutral-300">No expenses logged yet.</p> : null}
        <div className="grid gap-3 md:grid-cols-2">
          {recentExpenses.map((expense) => (
            <Link key={expense.id} href={`/expenses/${expense.id}`} className="rounded-xl border border-white/10 bg-neutral-900 p-4">
              <p className="font-semibold">${expense.amount.toFixed(2)}</p>
              <p className="text-sm text-neutral-300">{expense.category}</p>
              <p className="text-sm text-neutral-300">{expense.vendor ?? "No vendor"}</p>
              <p className="mt-2 text-sm text-neutral-200">{expense.date.slice(0, 10)}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Timeline Activity</h2>
          <Link href="/projects" className="text-sm text-red-300">View all</Link>
        </div>
        {recentTimeline.length === 0 ? <p className="rounded-xl border border-white/10 bg-neutral-900 p-4 text-sm text-neutral-300">No timeline activity yet.</p> : null}
        <div className="grid gap-3 md:grid-cols-2">
          {recentTimeline.map((item) => (
            <Link key={item.id} href={`/projects/${item.project_id}`} className="rounded-xl border border-white/10 bg-neutral-900 p-4">
              <p className="font-semibold">{item.type}</p>
              <p className="text-sm text-neutral-200">{item.title}</p>
              <p className="text-sm text-neutral-300">{item.description ?? "No notes"}</p>
              <p className="mt-2 text-sm text-neutral-200">{item.date.slice(0, 10)}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
