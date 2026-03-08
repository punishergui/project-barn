"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { apiClientJson, Expense, Profile, Project, Show } from "@/lib/api";

const tabs = ["projects", "shows", "expenses"] as const;

export default function KidDetailPage() {
  const params = useParams<{ id: string }>();
  const kidId = Number(params.id);
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("projects");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    Promise.all([
      apiClientJson<Profile[]>("/profiles"),
      apiClientJson<Project[]>("/projects"),
      apiClientJson<Show[]>("/shows"),
      apiClientJson<Expense[]>("/expenses")
    ]).then(([profileData, projectData, showData, expenseData]) => {
      setProfiles(profileData);
      setProjects(projectData);
      setShows(showData);
      setExpenses(expenseData);
    }).catch(() => undefined);
  }, [kidId]);

  const kid = profiles.find((profile) => profile.id === kidId);
  const kidProjects = projects.filter((project) => project.owner_profile_id === kidId);
  const kidProjectIds = new Set(kidProjects.map((project) => project.id));

  const kidExpenses = useMemo(() => expenses.filter((expense) => {
    const allocations = expense.allocations.length > 0 ? expense.allocations : [{ project_id: expense.project_id }];
    return allocations.some((allocation) => kidProjectIds.has(allocation.project_id));
  }), [expenses, kidProjectIds]);

  const kidShows = useMemo(() => shows.filter((show) => show.entries.some((entry) => kidProjectIds.has(entry.project_id))), [shows, kidProjectIds]);

  if (!kid) return <p className="text-sm text-muted-foreground">Loading kid profile...</p>;

  return <div className="space-y-4 pb-2">
    <header className="rounded-2xl bg-card border border-border shadow-sm p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground font-bold text-xl">
          {kid.avatar_url ? <img src={kid.avatar_url} alt={kid.name} className="h-full w-full object-cover" /> : <span>{kid.name.slice(0, 2).toUpperCase()}</span>}
        </div>
        <div>
          <h1 className="font-serif text-2xl text-foreground">{kid.name}</h1>
          <p className="text-sm capitalize text-muted-foreground">{kid.role}</p>
        </div>
      </div>
    </header>

    <div className="flex gap-2 overflow-x-auto">
      {tabs.map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className={activeTab === tab ? "bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium capitalize" : "bg-secondary text-foreground rounded-xl px-4 py-2 text-sm capitalize"}>{tab}</button>)}
    </div>

    {activeTab === "projects" ? <section className="space-y-2">
      {kidProjects.length === 0 ? <p className="rounded-2xl bg-card border border-border shadow-sm px-4 py-3 text-sm text-muted-foreground">No projects assigned to this kid.</p> : null}
      {kidProjects.map((project) => <Link key={project.id} href={`/projects/${project.id}`} className="rounded-2xl bg-card border border-border shadow-sm px-4 py-3 block"><div className="flex items-center gap-3"><div className="h-20 w-20 shrink-0 rounded-xl bg-secondary" /><div className="min-w-0 flex-1"><p className="font-semibold text-sm text-foreground">{project.name}</p><p className="text-sm text-muted-foreground">Owner: {kid.name}</p><p className="text-sm text-muted-foreground capitalize">{project.species} • {project.status}</p></div></div></Link>)}
    </section> : null}

    {activeTab === "shows" ? <section className="space-y-2">
      {kidShows.length === 0 ? <p className="rounded-2xl bg-card border border-border shadow-sm px-4 py-3 text-sm text-muted-foreground">No shows linked to this kid yet.</p> : null}
      {kidShows.map((show) => <Link key={show.id} href={`/shows/${show.id}`} className="rounded-2xl bg-card border border-border shadow-sm px-4 py-3 block"><p className="font-medium text-sm text-foreground">{show.name}</p><p className="text-xs text-muted-foreground">{show.location}</p></Link>)}
    </section> : null}

    {activeTab === "expenses" ? <section className="rounded-2xl bg-card border border-border shadow-sm px-4 py-3">
      {kidExpenses.length === 0 ? <p className="text-sm text-muted-foreground">No expenses tied to this kid’s projects.</p> : null}
      {kidExpenses.map((expense) => <Link key={expense.id} href={`/expenses/${expense.id}`} className="flex justify-between border-b border-border py-2 text-sm"><span className="text-foreground">{expense.category}</span><span className="text-muted-foreground">${expense.amount.toFixed(2)} • {expense.date.slice(0, 10)}</span></Link>)}
    </section> : null}
  </div>;
}
