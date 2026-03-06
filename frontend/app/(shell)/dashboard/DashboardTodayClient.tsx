import Link from "next/link";

type QuickAction = { href: string; label: string; emoji: string };
type DashboardProject = { id: number; name: string; project_type: string; project_category: string | null; is_livestock: boolean; owner: string; photo_url: string | null; spent_total: number; open_tasks: number; latest_weight_lbs: number | null; next_event: string | null };
type DashboardShow = { id: number; name: string; date: string | null; location: string | null };
type DashboardExpense = { id: number; amount: number; date: string | null; category: string; vendor: string | null; has_receipt: boolean; project_name: string };
type DashboardActivity = { id: string; title: string; subtitle: string; date: string; href: string };
type LowFeedInventory = { id: number; name: string; qty_on_hand: number; unit: string; low_stock_threshold: number | null };
type RecentFeedEvent = { id: number; project_id: number; project_name: string; recorded_at: string | null; feed_type: string; amount: number; unit: string };
type FinanceSummary = { total_spent: number; total_income: number; net_balance: number; recent_sale: { id: number; buyer_name: string; sale_date: string; final_payout: number } | null };
type UpcomingReminder = { id: number; project_name: string; type: string; time_of_day: string | null; notes: string | null; parent_locked: boolean; route: string };

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
  hasLoadError: boolean;
  unreadNotifications: number;
  upcomingReminders: UpcomingReminder[];
};

function shortDate(value: string | null) {
  if (!value) return "No date";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function DashboardTodayClient({ todayLabel, profileName, familyName, quickActions, activeProjects, upcomingShows, recentExpenses, recentActivity, lowFeedInventory, recentFeedEvents, financeSummary, hasLoadError, unreadNotifications, upcomingReminders }: Props) {
  return <div className="w-full space-y-4 px-4 pb-6">
    <section className="rounded-2xl border border-[var(--barn-border)] bg-gradient-to-br from-[var(--barn-red)]/25 to-[var(--barn-surface)] p-5">
      <p className="text-xs uppercase tracking-wide text-[var(--barn-muted)]">{todayLabel}</p>
      <h1 className="mt-2 text-3xl font-semibold">Hi, {profileName}</h1>
      <p className="mt-1 text-sm text-[var(--barn-muted)]">{familyName ?? "Welcome back to Project Barn"}</p>
    </section>

    {hasLoadError ? <section className="barn-card text-sm text-red-200">We could not refresh dashboard data.</section> : null}

    <section className="barn-card space-y-3">
      <h2 className="text-base font-semibold">Quick actions</h2>
      <div className="grid grid-cols-2 gap-2">{quickActions.map((item) => <Link key={item.href} href={item.href} className="flex min-h-14 items-center gap-2 rounded-xl border border-[var(--barn-border)] bg-[var(--barn-bg)] px-3 py-2 text-sm font-medium"><span>{item.emoji}</span><span>{item.label}</span></Link>)}</div>
    </section>

    <section className="barn-card space-y-3">
      <div className="flex items-center justify-between"><h2 className="text-base font-semibold">Alerts</h2><Link href="/notifications" className="see-all-link">Open</Link></div>
      <p className="barn-row text-sm">Unread notifications: {unreadNotifications}</p>
      {upcomingReminders.length === 0 ? <p className="barn-row text-sm text-[var(--barn-muted)]">No upcoming reminders.</p> : upcomingReminders.slice(0, 4).map((item) => <Link key={item.id} href={item.route} className="barn-row block"><p className="font-medium">{item.project_name} • {item.type.replace("_", " ")}{item.parent_locked ? " 🔒" : ""}</p><p className="text-xs text-[var(--barn-muted)]">{item.time_of_day || "Any time"}{item.notes ? ` • ${item.notes}` : ""}</p></Link>)}
    </section>

    <section className="barn-card space-y-3"><div className="flex items-center justify-between"><h2 className="text-base font-semibold">Active Projects</h2><Link href="/projects" className="see-all-link">See all</Link></div>{activeProjects.map((project) => <Link key={project.id} href={`/projects/${project.id}`} className="barn-row block"><p className="font-medium">{project.name}</p><p className="text-xs text-[var(--barn-muted)]">{project.project_category || project.project_type} • {project.owner} • Open tasks {project.open_tasks}</p></Link>)}</section>

    <section className="barn-card space-y-3"><div className="flex items-center justify-between"><h2 className="text-base font-semibold">Upcoming Shows</h2><Link href="/shows" className="see-all-link">See all</Link></div>{upcomingShows.length === 0 ? <p className="barn-row text-sm text-[var(--barn-muted)]">No upcoming shows scheduled.</p> : upcomingShows.map((show) => <Link key={show.id} href={`/shows/${show.id}`} className="barn-row block"><p className="font-medium">{show.name}</p><p className="text-xs text-[var(--barn-muted)]">{shortDate(show.date)} • {show.location ?? "Location TBD"}</p></Link>)}</section>

    <section className="barn-card space-y-3"><div className="flex items-center justify-between"><h2 className="text-base font-semibold">Finance Snapshot</h2><Link href="/income" className="see-all-link">Income</Link></div><div className="grid grid-cols-1 gap-2 sm:grid-cols-3 text-sm"><article className="barn-row">Spent ${financeSummary.total_spent.toFixed(2)}</article><article className="barn-row">Income ${financeSummary.total_income.toFixed(2)}</article><article className="barn-row">Net ${financeSummary.net_balance.toFixed(2)}</article></div></section>

    <section className="barn-card space-y-3"><h2 className="text-base font-semibold">Recent Expenses</h2>{recentExpenses.slice(0, 4).map((expense) => <Link key={expense.id} href={`/expenses/${expense.id}`} className="barn-row block"><p className="font-medium">${expense.amount.toFixed(2)} • {expense.project_name}</p><p className="text-xs text-[var(--barn-muted)]">{shortDate(expense.date)} • {expense.vendor || expense.category}</p></Link>)}</section>

    <section className="barn-card space-y-3"><h2 className="text-base font-semibold">Recent Feeding</h2>{recentFeedEvents.slice(0, 4).map((event) => <Link key={event.id} href={`/projects/${event.project_id}/feed`} className="barn-row block"><p className="font-medium">{event.project_name} • {event.feed_type}</p><p className="text-xs text-[var(--barn-muted)]">{event.amount} {event.unit} • {shortDate(event.recorded_at)}</p></Link>)}</section>

    <section className="barn-card space-y-3"><div className="flex items-center justify-between"><h2 className="text-base font-semibold">Recent Activity</h2><Link href="/activity" className="see-all-link">Full feed</Link></div>{recentActivity.slice(0, 6).map((item) => <Link key={item.id} href={item.href} className="barn-row block"><p className="font-medium">{item.title}</p><p className="text-xs text-[var(--barn-muted)]">{item.subtitle} • {shortDate(item.date)}</p></Link>)}</section>

    {lowFeedInventory.length > 0 ? <section className="barn-card space-y-2"><h2 className="text-base font-semibold">Feed Alerts</h2>{lowFeedInventory.slice(0, 4).map((item) => <p key={item.id} className="barn-row text-sm">{item.name}: {item.qty_on_hand} {item.unit}</p>)}</section> : null}
  </div>;
}
