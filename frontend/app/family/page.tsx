"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { apiClientJson, Expense, Profile, Project } from "@/lib/api";

function getSeasonRange(year: number) {
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

export default function FamilyPage() {
  const currentYear = new Date().getFullYear();
  const [season, setSeason] = useState(String(currentYear));
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { start, end } = getSeasonRange(Number(season));
      const [profileData, projectData, expenseData] = await Promise.all([
        apiClientJson<Profile[]>("/profiles"),
        apiClientJson<Project[]>("/projects"),
        apiClientJson<Expense[]>(`/expenses?start_date=${start}&end_date=${end}`)
      ]);
      setProfiles(profileData);
      setProjects(projectData);
      setExpenses(expenseData);
      setLoading(false);
    };
    load().catch(() => setLoading(false));
  }, [season]);

  const visibleProfiles = useMemo(() => profiles.filter((profile) => profile.role === "kid" || profile.role === "parent"), [profiles]);

  const expenseByKid = useMemo(() => {
    const projectOwner = new Map(projects.map((project) => [project.id, project.owner_profile_id]));
    const totals = new Map<number, number>();
    expenses.forEach((expense) => {
      const rows = expense.allocations.length > 0 ? expense.allocations : [{ project_id: expense.project_id, amount: expense.amount }];
      rows.forEach((allocation) => {
        const ownerId = projectOwner.get(allocation.project_id);
        if (!ownerId) return;
        totals.set(ownerId, (totals.get(ownerId) ?? 0) + allocation.amount);
      });
    });
    return totals;
  }, [expenses, projects]);

  const projectsByKid = useMemo(() => {
    const grouped = new Map<number, Project[]>();
    projects.forEach((project) => {
      grouped.set(project.owner_profile_id, [...(grouped.get(project.owner_profile_id) ?? []), project]);
    });
    return grouped;
  }, [projects]);

  return <div className="space-y-4 pb-2">
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-semibold">Family</h1>
      <select value={season} onChange={(event) => setSeason(event.target.value)} className="rounded bg-neutral-900 px-3 py-2 text-sm">
        {[currentYear - 1, currentYear, currentYear + 1].map((year) => <option key={year} value={year}>{year} Season</option>)}
      </select>
    </div>

    <section className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-300">Kids</h2>
      {loading ? <div className="space-y-2">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded bg-neutral-900" />)}</div> : null}
      {!loading && visibleProfiles.length === 0 ? <p className="rounded bg-neutral-900 p-3 text-sm text-neutral-300">No kids/profiles found yet.</p> : null}
      <div className="grid gap-2">
        {visibleProfiles.map((profile) => {
          const kidProjects = projectsByKid.get(profile.id) ?? [];
          const total = expenseByKid.get(profile.id) ?? 0;
          return <Link key={profile.id} href={`/family/kids/${profile.id}`} className="rounded border border-white/10 bg-neutral-900 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-neutral-800">
                {profile.avatar_url ? <img src={profile.avatar_url} alt={profile.name} className="h-full w-full object-cover" /> : <span className="text-sm font-semibold">{profile.name.slice(0, 2).toUpperCase()}</span>}
              </div>
              <div className="flex-1"><p className="font-semibold">{profile.name}</p><p className="text-xs capitalize text-neutral-400">{profile.role}</p></div>
              <div className="text-right text-xs"><p>{kidProjects.length} projects</p><p className="text-emerald-300">${total.toFixed(2)}</p></div>
            </div>
          </Link>;
        })}
      </div>
    </section>

    <section className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-300">Animals / Projects</h2>
      {!loading && projects.length === 0 ? <p className="rounded bg-neutral-900 p-3 text-sm text-neutral-300">No animals/projects yet.</p> : null}
      <div className="space-y-3">
        {visibleProfiles.map((profile) => {
          const kidProjects = projectsByKid.get(profile.id) ?? [];
          if (!kidProjects.length) return null;
          return <article key={profile.id} className="rounded border border-white/10 bg-neutral-900 p-3">
            <p className="mb-2 text-sm font-semibold">{profile.name}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {kidProjects.map((project) => <Link href={`/projects/${project.id}`} key={project.id} className="rounded bg-neutral-800 p-3 text-sm"><p className="font-medium">{project.name}</p><p className="text-xs capitalize text-neutral-400">{project.species} • {project.status}</p></Link>)}
            </div>
          </article>;
        })}
      </div>
    </section>
  </div>;
}
