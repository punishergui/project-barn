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

  if (!kid) return <p className="text-sm text-neutral-300">Loading kid profile...</p>;

  return <div className="space-y-4 pb-2">
    <header className="rounded border border-white/10 bg-neutral-900 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-neutral-800">
          {kid.avatar_url ? <img src={kid.avatar_url} alt={kid.name} className="h-full w-full object-cover" /> : <span className="text-sm font-semibold">{kid.name.slice(0, 2).toUpperCase()}</span>}
        </div>
        <div>
          <h1 className="text-xl font-semibold">{kid.name}</h1>
          <p className="text-xs capitalize text-neutral-400">{kid.role}</p>
        </div>
      </div>
    </header>

    <div className="flex gap-2 overflow-x-auto">
      {tabs.map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded px-3 py-1 text-sm capitalize ${activeTab === tab ? "bg-red-700" : "bg-neutral-800"}`}>{tab}</button>)}
    </div>

    {activeTab === "projects" ? <section className="space-y-2">
      {kidProjects.length === 0 ? <p className="rounded bg-neutral-900 p-3 text-sm text-neutral-300">No projects assigned to this kid.</p> : null}
      {kidProjects.map((project) => <Link key={project.id} href={`/projects/${project.id}`} className="block rounded border border-white/10 bg-neutral-900 p-3"><p className="font-medium">{project.name}</p><p className="text-xs capitalize text-neutral-400">{project.species} • {project.status}</p></Link>)}
    </section> : null}

    {activeTab === "shows" ? <section className="space-y-2">
      {kidShows.length === 0 ? <p className="rounded bg-neutral-900 p-3 text-sm text-neutral-300">No shows linked to this kid yet.</p> : null}
      {kidShows.map((show) => <Link key={show.id} href={`/shows/${show.id}`} className="block rounded border border-white/10 bg-neutral-900 p-3"><p className="font-medium">{show.name}</p><p className="text-xs text-neutral-400">{show.location}</p></Link>)}
    </section> : null}

    {activeTab === "expenses" ? <section className="space-y-2">
      {kidExpenses.length === 0 ? <p className="rounded bg-neutral-900 p-3 text-sm text-neutral-300">No expenses tied to this kid’s projects.</p> : null}
      {kidExpenses.map((expense) => <Link key={expense.id} href={`/expenses/${expense.id}`} className="block rounded border border-white/10 bg-neutral-900 p-3 text-sm"><p>{expense.date.slice(0, 10)} • ${expense.amount.toFixed(2)}</p><p className="text-xs text-neutral-400">{expense.category} • {expense.vendor ?? "No vendor"}</p></Link>)}
    </section> : null}
  </div>;
}
