import Link from "next/link";

type KidItem = { id: number; name: string; role: string; avatarUrl: string | null };
type ProjectCard = { id: number; name: string; species: string; ownerName: string; spentTotal: number; nextShowLabel: string };
type ShowSummary = { id: number; name: string; startDate: string; location: string; entryCount: number };
type ExpenseSummary = { id: number; amount: number; category: string; date: string; projectName: string; allocationCount: number };
type ActivitySummary = { id: string; title: string; date: string; type: string; href: string };

type DashboardTodayClientProps = {
  todayLabel: string;
  profileName: string;
  kids: KidItem[];
  quickStats: { projects: number; upcomingShows: number; expenses: number };
  activeProjects: ProjectCard[];
  upcomingShows: ShowSummary[];
  recentExpenses: ExpenseSummary[];
  recentActivity: ActivitySummary[];
  quickActions: Array<{ href: string; label: string }>;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function DashboardTodayClient({ todayLabel, profileName, kids, quickStats, activeProjects, recentActivity }: DashboardTodayClientProps) {
  return (
    <div className="w-full space-y-4 px-4 pb-6">
      <section className="barn-card bg-gradient-to-br from-[var(--barn-red)]/20 to-[var(--barn-surface)]">
        <p className="text-sm text-[var(--barn-muted)]">{todayLabel}</p>
        <h1 className="mt-1 text-3xl font-semibold">Today</h1>
        <p className="text-sm text-[var(--barn-muted)]">{profileName}&apos;s dashboard</p>
      </section>

      <section className="barn-card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-medium">My Kids</h2>
          <Link href="/profile-picker" className="see-all-link">Switch</Link>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {kids.map((kid) => (
            <article key={kid.id} className="min-w-[140px] rounded-xl border border-[var(--barn-border)] bg-[var(--barn-bg)] p-3">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--barn-red)] text-sm font-semibold text-white">
                {kid.avatarUrl ? "👤" : kid.name.slice(0, 1).toUpperCase()}
              </div>
              <p className="text-sm font-semibold">{kid.name}</p>
              <p className="text-xs capitalize text-[var(--barn-muted)]">{kid.role}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="barn-card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-medium">Active Animals</h2>
          <Link href="/projects" className="see-all-link">See all</Link>
        </div>
        <div className="space-y-2">
          {activeProjects.length === 0 ? <p className="text-sm text-[var(--barn-muted)]">No active projects yet.</p> : null}
          {activeProjects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`} className="block rounded-xl border border-[var(--barn-border)] bg-[var(--barn-bg)] p-4">
              <p className="text-lg font-semibold">{project.name}</p>
              <p className="text-xs text-[var(--barn-muted)]">{project.species} • {project.ownerName}</p>
              <p className="mt-1 text-xs text-[var(--barn-muted)]">Spent ${project.spentTotal.toFixed(2)} • {project.nextShowLabel}</p>
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
            <Link key={entry.id} href={entry.href} className="barn-row block">
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
