import Link from "next/link";

type ProjectCard = { id: number; name: string; species: string; ownerName: string; spentTotal: number; nextShowLabel: string };
type ShowSummary = { id: number; name: string; startDate: string; location: string };
type ExpenseSummary = { id: number; amount: number; category: string; date: string; projectName: string };
type ActivitySummary = { id: number; projectId: number; title: string; date: string; type: string };

type DashboardTodayClientProps = {
  todayLabel: string;
  profileName: string;
  quickStats: { projects: number; upcomingShows: number; expenses: number };
  activeProjects: ProjectCard[];
  upcomingShows: ShowSummary[];
  recentExpenses: ExpenseSummary[];
  recentActivity: ActivitySummary[];
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function DashboardTodayClient({
  todayLabel,
  profileName,
  quickStats,
  activeProjects,
  upcomingShows,
  recentExpenses,
  recentActivity
}: DashboardTodayClientProps) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 pb-6">
      <section className="barn-card">
        <p className="text-sm text-[var(--barn-muted)]">{todayLabel}</p>
        <h1 className="mt-1 text-2xl font-semibold">Welcome back, {profileName}</h1>
      </section>

      <section className="grid grid-cols-2 gap-2">
        <Link href="/projects/new" className="quick-action-card">Add Project</Link>
        <Link href="/expenses/new" className="quick-action-card">Add Expense</Link>
        <Link href="/shows" className="quick-action-card">Show Day Mode</Link>
        <Link href="/reports" className="quick-action-card">Reports</Link>
      </section>

      <section className="barn-card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-medium">Active Projects</h2>
          <Link href="/projects" className="see-all-link">See all</Link>
        </div>
        <div className="space-y-2">
          {activeProjects.length === 0 ? <p className="text-sm text-[var(--barn-muted)]">No active projects yet.</p> : null}
          {activeProjects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`} className="barn-row block">
              <p className="font-medium">{project.name}</p>
              <p className="text-xs text-[var(--barn-muted)]">{project.species} • {project.ownerName}</p>
              <p className="mt-1 text-xs text-[var(--barn-muted)]">Spent ${project.spentTotal.toFixed(2)} • {project.nextShowLabel}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="barn-card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-medium">Upcoming Shows</h2>
          <Link href="/shows" className="see-all-link">See all</Link>
        </div>
        <div className="space-y-2">
          {upcomingShows.length === 0 ? <p className="text-sm text-[var(--barn-muted)]">No upcoming shows.</p> : null}
          {upcomingShows.map((show) => (
            <Link key={show.id} href={`/shows/${show.id}`} className="barn-row block">
              <p className="font-medium">{show.name}</p>
              <p className="text-xs text-[var(--barn-muted)]">{formatDate(show.startDate)} • {show.location}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="barn-card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-medium">Recent Expenses</h2>
          <Link href="/expenses" className="see-all-link">See all</Link>
        </div>
        <div className="space-y-2">
          {recentExpenses.length === 0 ? <p className="text-sm text-[var(--barn-muted)]">No expenses yet.</p> : null}
          {recentExpenses.map((expense) => (
            <Link key={expense.id} href={`/expenses/${expense.id}`} className="barn-row block">
              <p className="font-medium">${expense.amount.toFixed(2)} • {expense.category}</p>
              <p className="text-xs text-[var(--barn-muted)]">{formatDate(expense.date)} • {expense.projectName}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="barn-card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-medium">Recent Activity</h2>
          <Link href="/projects" className="see-all-link">See all</Link>
        </div>
        <div className="space-y-2">
          {recentActivity.length === 0 ? <p className="text-sm text-[var(--barn-muted)]">No activity yet.</p> : null}
          {recentActivity.map((entry) => (
            <Link key={entry.id} href={`/projects/${entry.projectId}?tab=timeline`} className="barn-row block">
              <p className="font-medium">{entry.title}</p>
              <p className="text-xs text-[var(--barn-muted)]">{entry.type} • {formatDate(entry.date)}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2">
        <article className="barn-chip">{quickStats.projects}<span>Projects</span></article>
        <article className="barn-chip">{quickStats.upcomingShows}<span>Shows</span></article>
        <article className="barn-chip">{quickStats.expenses}<span>Expenses</span></article>
      </section>
    </div>
  );
}
