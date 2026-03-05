"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { apiClientJson, AuthStatus, Expense, Profile, Project, Show, TimelineEntry } from "@/lib/api";

const sections = ["overview", "timeline", "expenses", "shows"] as const;
const timelineTypes = ["Feeding", "Training", "Health", "Vet", "Wash", "Clip", "Show", "Expense", "Other"];

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeSection, setActiveSection] = useState<(typeof sections)[number]>("overview");
  const [project, setProject] = useState<Project | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [showAddTimeline, setShowAddTimeline] = useState(false);
  const [quickType, setQuickType] = useState("Other");

  const load = async () => {
    const id = Number(params.id);
    const [projectData, expenseData, showData, timelineData, authData, profileData] = await Promise.all([
      apiClientJson<Project>(`/projects/${id}`),
      apiClientJson<Expense[]>(`/expenses?project_id=${id}`),
      apiClientJson<Show[]>(`/projects/${id}/shows`),
      apiClientJson<TimelineEntry[]>(`/projects/${id}/timeline`),
      apiClientJson<AuthStatus>("/auth/status"),
      apiClientJson<Profile[]>("/profiles")
    ]);
    setProject(projectData);
    setExpenses(expenseData);
    setShows(showData);
    setTimeline(timelineData);
    setAuth(authData);
    setProfiles(profileData);
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [params.id]);

  const ownerName = profiles.find((profile) => profile.id === project?.owner_profile_id)?.name ?? "Unknown";


  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && sections.includes(tab as (typeof sections)[number])) {
      setActiveSection(tab as (typeof sections)[number]);
    }
  }, [searchParams]);

  const totalExpenses = useMemo(() => {
    const projectId = Number(params.id);
    return expenses.reduce((sum, expense) => sum + expense.allocations.filter((a) => a.project_id === projectId).reduce((inner, a) => inner + a.amount, 0), 0);
  }, [expenses, params.id]);

  const upcomingShow = useMemo(() => {
    const now = new Date().setHours(0, 0, 0, 0);
    return [...shows].filter((show) => new Date(show.start_date).getTime() >= now).sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())[0] ?? null;
  }, [shows]);

  const addTimeline = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const type = String(form.get("type") ?? quickType);
    await apiClientJson(`/projects/${params.id}/timeline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        title: String(form.get("title") || type),
        description: String(form.get("note") || "").trim() || null,
        date: form.get("date")
      })
    });
    event.currentTarget.reset();
    setShowAddTimeline(false);
    await load();
  };

  const remove = async () => {
    await apiClientJson(`/projects/${params.id}`, { method: "DELETE" });
    router.push("/projects");
  };

  if (!project) return <p>Loading project...</p>;

  return (
    <div className="space-y-4 pb-3">
      <header className="rounded-xl border border-white/10 bg-neutral-900 p-4">
        <h1 className="text-3xl font-semibold">{project.name}</h1>
        <p className="text-sm capitalize text-neutral-300">{project.species} • {ownerName}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <Link href={`/expenses/new?projectId=${project.id}`} className="rounded bg-red-700 px-3 py-2">Add Expense</Link>
          <button onClick={() => setActiveSection("timeline")} className="rounded bg-neutral-800 px-3 py-2">Add Timeline</button>
          <Link href={upcomingShow ? `/shows/${upcomingShow.id}/day` : "/shows"} className="rounded bg-neutral-800 px-3 py-2">{upcomingShow ? "Show Day" : "Shows"}</Link>
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto">
        {sections.map((section) => <button key={section} onClick={() => setActiveSection(section)} className={`rounded-full px-3 py-1.5 text-sm capitalize ${activeSection === section ? "bg-red-700" : "bg-neutral-800"}`}>{section}</button>)}
      </div>

      {activeSection === "overview" ? <section className="space-y-3 rounded-xl border border-white/10 bg-neutral-900 p-4 text-sm">
        <div className="grid gap-2 md:grid-cols-2">
          <p><span className="text-neutral-400">Tag:</span> {project.tag ?? "N/A"}</p>
          <p><span className="text-neutral-400">Status:</span> <span className="capitalize">{project.status}</span></p>
          <p><span className="text-neutral-400">Total spent:</span> ${totalExpenses.toFixed(2)}</p>
          <p><span className="text-neutral-400">Next show:</span> {upcomingShow ? upcomingShow.start_date.slice(0, 10) : "Not scheduled"}</p>
        </div>
        <p><span className="text-neutral-400">Notes:</span> {project.notes ?? "No notes yet."}</p>
        {auth?.role === "parent" && auth.is_unlocked ? <div className="flex gap-2"><Link href={`/projects/${project.id}/edit`} className="rounded bg-neutral-800 px-3 py-2">Edit</Link><button onClick={remove} className="rounded bg-red-900 px-3 py-2">Delete</button></div> : null}
      </section> : null}

      {activeSection === "timeline" ? <section className="space-y-3 rounded-xl border border-white/10 bg-neutral-900 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Timeline</h2>
          <button onClick={() => setShowAddTimeline((prev) => !prev)} className="rounded bg-red-700 px-3 py-1.5 text-sm">Add entry</button>
        </div>
        <div className="flex flex-wrap gap-2">{timelineTypes.map((type) => <button key={type} onClick={() => { setQuickType(type); setShowAddTimeline(true); }} className={`rounded px-2 py-1 text-xs ${quickType === type ? "bg-red-700" : "bg-neutral-800"}`}>{type}</button>)}</div>
        {showAddTimeline ? <form className="grid gap-2 rounded bg-neutral-800 p-3" onSubmit={addTimeline}><input name="date" type="date" className="rounded bg-neutral-900 p-2" required /><input name="title" placeholder="Title" className="rounded bg-neutral-900 p-2" /><select name="type" value={quickType} onChange={(event) => setQuickType(event.target.value)} className="rounded bg-neutral-900 p-2">{timelineTypes.map((type) => <option key={type}>{type}</option>)}</select><textarea name="note" placeholder="Note" className="rounded bg-neutral-900 p-2" /><button className="rounded bg-red-700 px-3 py-2 text-sm">Save entry</button></form> : null}
        {timeline.length === 0 ? <p className="rounded bg-neutral-800 p-3 text-sm text-neutral-300">No timeline entries yet.</p> : timeline.map((item) => <article key={item.id} className="rounded bg-neutral-800 p-3 text-sm"><p className="font-medium">{item.title}</p><p className="text-xs text-neutral-400">{item.date.slice(0, 10)} • {item.type}</p><p className="text-neutral-300">{item.description ?? "No note."}</p></article>)}
      </section> : null}

      {activeSection === "expenses" ? <section className="space-y-3 rounded-xl border border-white/10 bg-neutral-900 p-4 text-sm">
        <div className="flex items-center justify-between"><h2 className="font-semibold">Expenses</h2><Link href={`/expenses/new?projectId=${project.id}`} className="rounded bg-red-700 px-3 py-2 text-xs">Add expense</Link></div>
        {expenses.length === 0 ? <p className="rounded bg-neutral-800 p-3 text-neutral-300">No expenses logged yet.</p> : expenses.map((expense) => <Link href={`/expenses/${expense.id}`} key={expense.id} className="block rounded bg-neutral-800 p-3">{expense.date.slice(0, 10)} • ${expense.amount.toFixed(2)} • {expense.category}</Link>)}
      </section> : null}

      {activeSection === "shows" ? <section className="space-y-3 rounded-xl border border-white/10 bg-neutral-900 p-4 text-sm">
        <h2 className="font-semibold">Shows</h2>
        {shows.length === 0 ? <p className="rounded bg-neutral-800 p-3 text-neutral-300">No shows for this animal yet.</p> : shows.map((show) => <Link key={show.id} href={`/shows/${show.id}`} className="block rounded bg-neutral-800 p-3">{show.name} • {show.start_date.slice(0, 10)}</Link>)}
      </section> : null}
    </div>
  );
}
