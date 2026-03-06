import Link from "next/link";

type QuickAction = { href: string; label: string; emoji: string };

type DashboardProject = {
  id: number;
  name: string;
  species: string;
  owner: string;
  status: string;
  photo_url: string | null;
  spent_total: number;
  open_tasks: number;
  latest_weight_lbs: number | null;
  next_show: { id: number; name: string; date: string | null } | null;
};

type DashboardShow = { id: number; name: string; date: string | null; location: string | null };
type DashboardExpense = { id: number; amount: number; date: string | null; category: string; vendor: string | null; has_receipt: boolean; project_name: string };
type DashboardActivity = { id: string; kind: string; title: string; subtitle: string; date: string; href: string };
type LowFeedInventory = { id: number; name: string; qty_on_hand: number; unit: string; low_stock_threshold: number | null };
type RecentFeedEvent = { id: number; project_id: number; project_name: string; recorded_at: string | null; feed_type: string; amount: number; unit: string };
type FinanceSummary = { total_spent: number; total_income: number; net_balance: number; recent_sale: { id: number; buyer_name: string; sale_date: string; final_payout: number } | null };

type Props = {
  todayLabel: string;
  profileName: string;
  familyName: string | null;
  quickActions: QuickAction[];
  activeProjects: DashboardProject[];
  upcomingShows: DashboardShow[];
  recentExpenses: DashboardExpense[];
  recentActivity: DashboardActivity[];
  lowFeedInventory: LowFeedInventory[];
  recentFeedEvents: RecentFeedEvent[];
  financeSummary: FinanceSummary;
};

function shortDate(value: string | null) {
  if (!value) return "No date";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function DashboardTodayClient({
  todayLabel,
  profileName,
  familyName,
  quickActions,
  activeProjects,
  upcomingShows,
  recentExpenses,
  recentActivity,
  lowFeedInventory,
  recentFeedEvents,
  financeSummary
}: Props) {
  return (
    <div className="w-full space-y-4 px-4 pb-6">
      <section className="rounded-2xl border border-[var(--barn-border)] bg-gradient-to-br from-[var(--barn-red)]/25 to-[var(--barn-surface)] p-5">
        <p className="text-xs uppercase tracking-wide text-[var(--barn-muted)]">{todayLabel}</p>
        <h1 className="mt-2 text-3xl font-semibold">Hi, {profileName}</h1>
        <p className="mt-1 text-sm text-[var(--barn-muted)]">{familyName ?? "Welcome back to Project Barn"}</p>
      </section>

      <section className="barn-card space-y-3">
        <h2 className="text-base font-semibold">Quick actions</h2>
        <div className="grid grid-cols-2 gap-2">
          {quickActions.map((item) => (
            <Link key={item.href} href={item.href} className="flex min-h-14 items-center gap-2 rounded-xl border border-[var(--barn-border)] bg-[var(--barn-bg)] px-3 py-2 text-sm font-medium">
              <span aria-hidden="true">{item.emoji}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="barn-card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Active Projects</h2>
          <Link href="/projects" className="see-all-link">See all</Link>
        </div>
        {activeProjects.length === 0 ? <p className="barn-row text-sm text-[var(--barn-muted)]">No active projects yet.</p> : null}
        {activeProjects.map((project) => (
          <Link key={project.id} href={`/projects/${project.id}`} className="block rounded-xl border border-[var(--barn-border)] bg-[var(--barn-bg)] p-3">
            <div className="flex items-start gap-3">
              {project.photo_url ? <img src={project.photo_url} alt={project.name} className="h-16 w-16 rounded-lg object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[var(--barn-surface)] text-xs text-[var(--barn-muted)]">No photo</div>}
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold">{project.name}</p>
                <p className="text-xs capitalize text-[var(--barn-muted)]">{project.species} • {project.owner}</p>
                <p className="mt-1 text-xs text-[var(--barn-muted)]">Spent ${project.spent_total.toFixed(2)} • Open tasks {project.open_tasks}</p>
                <p className="text-xs text-[var(--barn-muted)]">Weight {project.latest_weight_lbs ? `${project.latest_weight_lbs} lbs` : "No weigh-ins yet"}</p>
              </div>
            </div>
          </Link>
        ))}
      </section>


      <section className="barn-card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Finance Snapshot</h2>
          <Link href="/income" className="see-all-link">Income</Link>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 text-sm">
          <article className="barn-row">Spent ${financeSummary.total_spent.toFixed(2)}</article>
          <article className="barn-row">Income ${financeSummary.total_income.toFixed(2)}</article>
          <article className="barn-row">Net ${financeSummary.net_balance.toFixed(2)}</article>
        </div>
        {financeSummary.recent_sale ? (
          <article className="barn-row text-sm">
            <p className="font-medium">Recent sale: {financeSummary.recent_sale.buyer_name}</p>
            <p className="text-xs text-[var(--barn-muted)]">{shortDate(financeSummary.recent_sale.sale_date)} • Net ${financeSummary.recent_sale.final_payout.toFixed(2)}</p>
          </article>
        ) : null}
      </section>

      <section className="barn-card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Upcoming Shows</h2>
          <Link href="/shows" className="see-all-link">See all</Link>
        </div>
        {upcomingShows.length === 0 ? <p className="barn-row text-sm text-[var(--barn-muted)]">No upcoming shows scheduled.</p> : null}
        {upcomingShows.map((show) => (
          <Link key={show.id} href={`/shows/${show.id}`} className="barn-row block">
            <p className="font-medium">{show.name}</p>
            <p className="text-xs text-[var(--barn-muted)]">{shortDate(show.date)} • {show.location ?? "Location TBD"}</p>
          </Link>
        ))}
      </section>

      <section className="barn-card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Recent Expenses</h2>
          <Link href="/expenses" className="see-all-link">See all</Link>
        </div>
        {recentExpenses.length === 0 ? <p className="barn-row text-sm text-[var(--barn-muted)]">No expenses logged yet.</p> : null}
        {recentExpenses.map((expense) => (
          <Link key={expense.id} href={`/expenses/${expense.id}`} className="barn-row block">
            <p className="font-medium">${expense.amount.toFixed(2)} • {expense.project_name}</p>
            <p className="text-xs text-[var(--barn-muted)]">{shortDate(expense.date)} • {expense.vendor || expense.category} • {expense.has_receipt ? "Receipt uploaded" : "No receipt"}</p>
          </Link>
        ))}
      </section>

      <section className="barn-card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Feed Alerts</h2>
          <Link href="/feed" className="see-all-link">Manage</Link>
        </div>
        {lowFeedInventory.length === 0 ? <p className="barn-row text-sm text-[var(--barn-muted)]">No low-stock feed alerts.</p> : lowFeedInventory.map((item) => (
          <Link key={item.id} href="/feed" className="barn-row block">
            <p className="font-medium">{item.name}</p>
            <p className="text-xs text-[var(--barn-muted)]">{item.qty_on_hand} {item.unit} left{item.low_stock_threshold !== null ? ` • threshold ${item.low_stock_threshold} ${item.unit}` : ""}</p>
          </Link>
        ))}
      </section>

      <section className="barn-card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Recent Feeding</h2>
          <Link href="/feed" className="see-all-link">Feed</Link>
        </div>
        {recentFeedEvents.length === 0 ? <p className="barn-row text-sm text-[var(--barn-muted)]">No recent feed events.</p> : recentFeedEvents.map((event) => (
          <Link key={event.id} href={`/projects/${event.project_id}/feed`} className="barn-row block">
            <p className="font-medium">{event.project_name} • {event.feed_type}</p>
            <p className="text-xs text-[var(--barn-muted)]">{event.amount} {event.unit} • {shortDate(event.recorded_at)}</p>
          </Link>
        ))}
      </section>

      <section className="barn-card space-y-3">
        <h2 className="text-base font-semibold">Recent Activity</h2>
        {recentActivity.length === 0 ? <p className="barn-row text-sm text-[var(--barn-muted)]">No recent activity yet.</p> : null}
        {recentActivity.map((item) => (
          <Link key={item.id} href={item.href} className="barn-row block">
            <p className="font-medium">{item.title}</p>
            <p className="text-xs text-[var(--barn-muted)]">{item.subtitle} • {shortDate(item.date)}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
