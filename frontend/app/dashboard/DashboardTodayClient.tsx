"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MouseEvent, useMemo, useState } from "react";

type KidOption = { id: number; name: string; avatarUrl: string | null };
type AnimalCard = { id: number; name: string; species: string; ownerId: number; ownerName: string; spentTotal: number; nextShowLabel: string; photoUrl: string | null };
type ShowSummary = { id: number; name: string; startDate: string; location: string };
type ExpenseSummary = { id: number; amount: number; category: string; date: string; projectName: string };
type ActivitySummary = { id: number; projectId: number; title: string; date: string; type: string };

type DashboardTodayClientProps = {
  todayLabel: string;
  kids: KidOption[];
  activeAnimals: AnimalCard[];
  upcomingShows: ShowSummary[];
  recentExpenses: ExpenseSummary[];
  recentActivity: ActivitySummary[];
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function DashboardTodayClient({ todayLabel, kids, activeAnimals, upcomingShows, recentExpenses, recentActivity }: DashboardTodayClientProps) {
  const router = useRouter();
  const [selectedKidId, setSelectedKidId] = useState<number | "all">("all");
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const filteredAnimals = useMemo(
    () => (selectedKidId === "all" ? activeAnimals : activeAnimals.filter((animal) => animal.ownerId === selectedKidId)),
    [activeAnimals, selectedKidId]
  );

  const stopCardClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation();
  };

  return (
    <div className="dashboard-today mx-auto w-full max-w-5xl space-y-5 px-4 pb-6 pt-2">
      <header className="dashboard-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Today</h1>
            <p className="text-sm text-neutral-300">{todayLabel}</p>
          </div>
          <div className="relative">
            <button type="button" onClick={() => setQuickAddOpen((current) => !current)} className="touch-target rounded-lg bg-[var(--barn-red)] px-4 py-2 text-sm font-semibold text-white" aria-haspopup="menu" aria-expanded={quickAddOpen}>Quick Add</button>
            {quickAddOpen ? <div className="absolute right-0 top-12 z-20 w-44 space-y-1 rounded-lg border border-[var(--barn-border)] bg-[var(--barn-dark)] p-2 text-sm shadow-lg">
              <Link href="/expenses/new" className="block rounded-md px-2 py-2 hover:bg-white/5">New Expense</Link>
              <Link href="/projects/new" className="block rounded-md px-2 py-2 hover:bg-white/5">New Project</Link>
              <Link href="/shows/new" className="block rounded-md px-2 py-2 hover:bg-white/5">New Show</Link>
            </div> : null}
          </div>
        </div>
      </header>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">My Kids</h2>
        <div className="kid-scroller">
          <button type="button" onClick={() => setSelectedKidId("all")} className={`kid-chip ${selectedKidId === "all" ? "kid-chip-active" : ""}`}>
            <span className="kid-avatar">ALL</span><span>All</span>
          </button>
          {kids.map((kid) => <button type="button" key={kid.id} onClick={() => setSelectedKidId(kid.id)} className={`kid-chip ${selectedKidId === kid.id ? "kid-chip-active" : ""}`}><span className="kid-avatar">{kid.avatarUrl ? <img src={kid.avatarUrl} alt={kid.name} className="h-full w-full object-cover" /> : kid.name.slice(0, 2).toUpperCase()}</span><span>{kid.name}</span></button>)}
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Active Animals</h2>
          <Link href="/projects" className="text-sm text-[var(--barn-red)]">View all</Link>
        </div>
        {filteredAnimals.length === 0 ? <p className="dashboard-card text-sm text-neutral-300">No active animals for this filter yet.</p> : null}
        <div className="space-y-3">
          {filteredAnimals.map((animal) => <article key={animal.id} onClick={() => router.push(`/projects/${animal.id}`)} className="animal-card cursor-pointer rounded-xl border border-[var(--barn-border)] bg-[var(--barn-dark)] p-4">
            <div className="flex gap-3">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[var(--barn-border)] bg-black/20 text-xs text-neutral-300">{animal.photoUrl ? <img src={animal.photoUrl} alt={animal.name} className="h-full w-full object-cover" /> : "Photo"}</div>
              <div className="flex-1 space-y-1">
                <p className="text-xl font-semibold leading-tight">{animal.name}</p>
                <p className="text-xs capitalize text-neutral-300">{animal.species} • {animal.ownerName}</p>
                <p className="text-lg font-semibold text-white">Spent ${animal.spentTotal.toFixed(2)}</p>
                <p className="text-xs text-neutral-300">Next show: {animal.nextShowLabel}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link href={`/projects/${animal.id}?tab=timeline`} onClick={stopCardClick} className="touch-target rounded-lg border border-[var(--barn-border)] bg-black/20 px-3 py-2 text-center text-sm font-medium">Timeline</Link>
              <Link href={`/expenses/new?projectId=${animal.id}`} onClick={stopCardClick} className="touch-target rounded-lg bg-[var(--barn-red)] px-3 py-2 text-center text-sm font-medium text-white">Add Expense</Link>
            </div>
          </article>)}
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <article className="dashboard-card"><div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold">Upcoming Shows</h3><Link href="/shows" className="text-xs text-[var(--barn-red)]">See all</Link></div>{upcomingShows.length === 0 ? <p className="text-sm text-neutral-300">No upcoming shows.</p> : upcomingShows.map((show) => <Link key={show.id} href={`/shows/${show.id}`} className="list-row block rounded-md"><p className="font-medium">{show.name}</p><p className="text-xs text-neutral-300">{formatDate(show.startDate)} • {show.location}</p></Link>)}</article>
        <article className="dashboard-card"><div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold">Recent Expenses</h3><Link href="/expenses" className="text-xs text-[var(--barn-red)]">See all</Link></div>{recentExpenses.length === 0 ? <p className="text-sm text-neutral-300">No expenses yet.</p> : recentExpenses.map((expense) => <Link key={expense.id} href={`/expenses/${expense.id}`} className="list-row block rounded-md"><p className="font-medium">${expense.amount.toFixed(2)} • {expense.category}</p><p className="text-xs text-neutral-300">{formatDate(expense.date)} • {expense.projectName}</p></Link>)}</article>
        <article className="dashboard-card"><h3 className="mb-2 text-sm font-semibold">Recent Activity</h3>{recentActivity.length === 0 ? <p className="text-sm text-neutral-300">No activity yet.</p> : recentActivity.map((entry) => <Link key={entry.id} href={`/projects/${entry.projectId}?tab=timeline`} className="list-row block rounded-md"><p className="font-medium">{entry.title}</p><p className="text-xs text-neutral-300">{entry.type} • {formatDate(entry.date)}</p></Link>)}</article>
      </section>
    </div>
  );
}
