import Link from "next/link";

import { Expense, Profile, Project, Show, TaskItem, TimelineEntry } from "@/lib/api";
import { apiJsonServer } from "@/lib/apiServer";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default async function DashboardPage() {
  const [projects, shows, expenses, profiles, tasks] = await Promise.all([
    apiJsonServer<Project[]>("/projects"),
    apiJsonServer<Show[]>("/shows"),
    apiJsonServer<Expense[]>("/expenses"),
    apiJsonServer<Profile[]>("/profiles"),
    apiJsonServer<TaskItem[]>("/tasks").catch(() => [])
  ]);

  const todayLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const kids = profiles.filter((profile) => profile.role === "kid");
  const ownerMap = new Map(profiles.map((profile) => [profile.id, profile.name]));
  const activeProjects = projects.filter((project) => project.status === "active");
  const upcomingShows = [...shows]
    .filter((show) => new Date(show.start_date).getTime() >= new Date().setHours(0, 0, 0, 0))
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

  const expenseByProject = new Map<number, number>();
  expenses.forEach((expense) => {
    const rows = expense.allocations.length > 0 ? expense.allocations : [{ project_id: expense.project_id, amount: expense.amount }];
    rows.forEach((allocation) => {
      expenseByProject.set(allocation.project_id, (expenseByProject.get(allocation.project_id) ?? 0) + allocation.amount);
    });
  });

  const nextShowByProject = new Map<number, string>();
  upcomingShows.forEach((show) => {
    show.entries.forEach((entry) => {
      if (!nextShowByProject.has(entry.project_id)) {
        nextShowByProject.set(entry.project_id, show.start_date);
      }
    });
  });

  const recentTimeline = (
    await Promise.all(activeProjects.map((project) => apiJsonServer<TimelineEntry[]>(`/projects/${project.id}/timeline`).catch(() => [])))
  )
    .flat()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const upcomingTasks = tasks
    .filter((task) => task.status === "open")
    .sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    })
    .slice(0, 3);

  return (
    <div className="space-y-4 pb-4 pt-2">
      <header className="rounded-xl border border-white/10 bg-neutral-900 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold">Today</h1>
            <p className="text-sm text-neutral-300">{todayLabel}</p>
          </div>
          <details className="relative">
            <summary className="cursor-pointer list-none rounded-lg bg-red-700 px-3 py-2 text-sm font-medium">Quick Add</summary>
            <div className="absolute right-0 top-11 z-20 w-44 space-y-1 rounded-lg border border-white/10 bg-neutral-900 p-2 text-sm shadow-lg">
              <Link href="/expenses/new" className="block rounded px-2 py-1 hover:bg-neutral-800">Add Expense</Link>
              <Link href="/projects" className="block rounded px-2 py-1 hover:bg-neutral-800">Add Timeline</Link>
              <Link href="/shows/new" className="block rounded px-2 py-1 hover:bg-neutral-800">Add Show</Link>
            </div>
          </details>
        </div>
      </header>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">My Kids</h2>
        {kids.length === 0 ? <p className="rounded-xl border border-white/10 bg-neutral-900 p-3 text-sm text-neutral-300">No kid profiles found yet.</p> : null}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {kids.map((kid) => (
            <Link key={kid.id} href={`/family/kids/${kid.id}`} className="min-w-36 rounded-xl border border-white/10 bg-neutral-900 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-neutral-800 text-xs font-semibold">
                  {kid.avatar_url ? <img src={kid.avatar_url} alt={kid.name} className="h-full w-full object-cover" /> : kid.name.slice(0, 2).toUpperCase()}
                </div>
                <p className="text-sm font-medium">{kid.name}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Active Animals</h2>
        {activeProjects.length === 0 ? <p className="rounded-xl border border-white/10 bg-neutral-900 p-3 text-sm text-neutral-300">No active animals yet.</p> : null}
        <div className="space-y-3">
          {activeProjects.slice(0, 6).map((project) => (
            <article key={project.id} className="rounded-xl border border-white/10 bg-neutral-900 p-4">
              <Link href={`/projects/${project.id}`}>
                <div className="flex gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-neutral-800 text-xs text-neutral-300">Photo</div>
                  <div className="flex-1">
                    <p className="text-lg font-semibold">{project.name}</p>
                    <p className="text-xs capitalize text-neutral-300">{project.species} • {ownerMap.get(project.owner_profile_id) ?? "Unknown owner"}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <p className="rounded bg-neutral-800 px-2 py-1">Spent ${(expenseByProject.get(project.id) ?? 0).toFixed(2)}</p>
                      <p className="rounded bg-neutral-800 px-2 py-1">Next show {nextShowByProject.get(project.id) ? formatDate(nextShowByProject.get(project.id) ?? "") : "None"}</p>
                    </div>
                  </div>
                </div>
              </Link>
              <div className="mt-3 flex gap-2 text-xs">
                <Link href={`/projects/${project.id}`} className="rounded bg-neutral-800 px-3 py-2">Timeline</Link>
                <Link href={`/expenses/new?project_id=${project.id}`} className="rounded bg-red-700 px-3 py-2">Add Expense</Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Next Up</h2>
        <div className="grid gap-2 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-neutral-900 p-3">
            <p className="mb-2 text-sm font-semibold">Upcoming Shows</p>
            {upcomingShows.slice(0, 2).map((show) => <Link key={show.id} href={`/shows/${show.id}`} className="mb-1 block rounded bg-neutral-800 p-2 text-sm">{show.name} • {formatDate(show.start_date)}</Link>)}
            {upcomingShows.length === 0 ? <p className="text-sm text-neutral-300">No upcoming shows.</p> : null}
          </div>
          <div className="rounded-xl border border-white/10 bg-neutral-900 p-3">
            <p className="mb-2 text-sm font-semibold">Upcoming Tasks</p>
            {upcomingTasks.map((task) => <p key={task.id} className="mb-1 rounded bg-neutral-800 p-2 text-sm">{task.title}{task.due_date ? ` • ${formatDate(task.due_date)}` : ""}</p>)}
            {upcomingTasks.length === 0 ? <p className="text-sm text-neutral-300">No tasks due soon.</p> : null}
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Recent</h2>
        <div className="grid gap-2 md:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-neutral-900 p-3">
            <p className="mb-2 text-sm font-semibold">Expenses</p>
            {expenses.slice(0, 5).map((expense) => <Link key={expense.id} href={`/expenses/${expense.id}`} className="mb-1 block rounded bg-neutral-800 p-2 text-sm">${expense.amount.toFixed(2)} • {expense.category}</Link>)}
            {expenses.length === 0 ? <p className="text-sm text-neutral-300">No expenses yet.</p> : null}
          </div>
          <div className="rounded-xl border border-white/10 bg-neutral-900 p-3">
            <p className="mb-2 text-sm font-semibold">Timeline</p>
            {recentTimeline.map((entry) => <Link key={entry.id} href={`/projects/${entry.project_id}`} className="mb-1 block rounded bg-neutral-800 p-2 text-sm">{entry.title} • {formatDate(entry.date)}</Link>)}
            {recentTimeline.length === 0 ? <p className="text-sm text-neutral-300">No timeline entries yet.</p> : null}
          </div>
        </div>
      </section>
    </div>
  );
}
