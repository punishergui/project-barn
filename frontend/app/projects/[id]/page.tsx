"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { apiClientJson, AuthStatus, Expense, MediaItem, Project, Show, TimelineEntry } from "@/lib/api";

const tabs = ["overview", "timeline", "shows", "expenses", "gallery"] as const;

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("overview");
  const [project, setProject] = useState<Project | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [auth, setAuth] = useState<AuthStatus | null>(null);

  const load = async () => {
    const id = Number(params.id);
    const [projectData, expenseData, showData, mediaData, timelineData, authData] = await Promise.all([
      apiClientJson<Project>(`/projects/${id}`),
      apiClientJson<Expense[]>(`/expenses?project_id=${id}`),
      apiClientJson<Show[]>(`/projects/${id}/shows`),
      apiClientJson<MediaItem[]>(`/media?project_id=${id}`),
      apiClientJson<TimelineEntry[]>(`/projects/${id}/timeline`),
      apiClientJson<AuthStatus>("/auth/status")
    ]);
    setProject(projectData);
    setExpenses(expenseData);
    setShows(showData);
    setMedia(mediaData);
    setTimeline(timelineData);
    setAuth(authData);
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [params.id]);

  const stats = useMemo(() => {
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.allocations.filter((a) => a.project_id === Number(params.id)).reduce((inner, a) => inner + a.amount, 0), 0);
    const placements = shows.flatMap((show) => show.entries.filter((entry) => entry.project_id === Number(params.id)).flatMap((entry) => entry.placings));
    const bestPlacing = placements.map((placing) => placing.placing).sort()[0] ?? "N/A";
    return { totalExpenses, showsEntered: shows.length, bestPlacing };
  }, [expenses, shows, params.id]);

  const addTimeline = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await apiClientJson(`/projects/${params.id}/timeline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: form.get("type"),
        title: form.get("title"),
        description: form.get("description"),
        date: form.get("date")
      })
    });
    event.currentTarget.reset();
    await load();
  };

  const upload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    form.set("project_id", String(params.id));
    await apiClientJson("/media/upload", { method: "POST", body: form });
    event.currentTarget.reset();
    await load();
  };

  const remove = async () => {
    await apiClientJson(`/projects/${params.id}`, { method: "DELETE" });
    router.push("/projects");
  };

  if (!project) return <p>Loading project...</p>;

  return <div className="space-y-4">
    <h1 className="text-2xl font-semibold">{project.name}</h1>
    <div className="flex gap-2 overflow-x-auto">
      {tabs.map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded px-3 py-1 text-sm capitalize ${activeTab === tab ? "bg-red-700" : "bg-neutral-800"}`}>{tab}</button>)}
    </div>

    {activeTab === "overview" ? <section className="rounded border border-white/10 bg-neutral-900 p-3 text-sm">
      <p>{project.species} • Tag {project.tag ?? "N/A"}</p>
      <p>Total expenses: ${stats.totalExpenses.toFixed(2)}</p>
      <p>Shows entered: {stats.showsEntered}</p>
      <p>Best placing: {stats.bestPlacing}</p>
      {auth?.role === "parent" && auth.is_unlocked ? <div className="mt-2 flex gap-2"><Link href={`/projects/${project.id}/edit`} className="rounded bg-neutral-800 px-3 py-2">Edit</Link><button onClick={remove} className="rounded bg-red-800 px-3 py-2">Delete</button></div> : null}
    </section> : null}

    {activeTab === "timeline" ? <section className="rounded border border-white/10 bg-neutral-900 p-3">
      {auth?.role === "parent" && auth.is_unlocked ? <form className="mb-3 grid gap-2" onSubmit={addTimeline}><input name="type" placeholder="Type" className="rounded bg-neutral-800 p-2" required /><input name="title" placeholder="Title" className="rounded bg-neutral-800 p-2" required /><input name="date" type="date" className="rounded bg-neutral-800 p-2" required /><textarea name="description" placeholder="Description" className="rounded bg-neutral-800 p-2" /><button className="rounded bg-red-700 px-3 py-2">Add Entry</button></form> : null}
      <div className="space-y-2">{timeline.map((item) => <article key={item.id} className="rounded bg-neutral-800 p-2 text-sm"><p className="font-medium">{item.title}</p><p>{item.type} • {item.date.slice(0, 10)}</p><p className="text-neutral-300">{item.description}</p></article>)}</div>
    </section> : null}

    {activeTab === "shows" ? <section className="rounded border border-white/10 bg-neutral-900 p-3 text-sm">{shows.map((show) => show.entries.filter((entry) => entry.project_id === Number(params.id)).map((entry) => <div key={`${show.id}-${entry.id}`} className="mb-2 rounded bg-neutral-800 p-2"><p className="font-medium">{show.name}</p><p>{entry.class_name} • {entry.division}</p>{entry.placings.map((placing) => <p key={placing.id}>{placing.placing} {placing.points ? `• ${placing.points} pts` : ""}</p>)}</div>))}</section> : null}

    {activeTab === "expenses" ? <section className="rounded border border-white/10 bg-neutral-900 p-3 text-sm">{expenses.map((expense) => { const allocated = expense.allocations.filter((a) => a.project_id === Number(params.id)).reduce((sum, a) => sum + a.amount, 0); return <p key={expense.id}>{expense.date.slice(0, 10)} • ${allocated.toFixed(2)} • {expense.category}</p>; })}</section> : null}

    {activeTab === "gallery" ? <section className="rounded border border-white/10 bg-neutral-900 p-3">
      <form className="mb-3 grid gap-2" onSubmit={upload}>
        <input name="file" type="file" className="rounded bg-neutral-800 p-2" required />
        <input name="caption" className="rounded bg-neutral-800 p-2" placeholder="Caption" />
        <button disabled={!(auth?.role === "parent" && auth.is_unlocked)} className="rounded bg-red-700 px-3 py-2 disabled:opacity-50">Upload</button>
      </form>
      <div className="grid grid-cols-2 gap-2">{media.map((item) => <div key={item.id} className="rounded bg-neutral-800 p-2"><img src={item.url} alt={item.caption ?? item.file_name} className="h-28 w-full rounded object-cover" /><p className="text-xs text-neutral-300">{item.caption ?? item.file_name}</p></div>)}</div>
    </section> : null}
  </div>;
}
