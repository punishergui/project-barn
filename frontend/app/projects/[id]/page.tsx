"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { apiClientJson, AuthStatus, Expense, MediaItem, Profile, Project, Show, TimelineEntry } from "@/lib/api";

const sections = ["overview", "timeline", "expenses", "media"] as const;
const timelineTypes = ["Feeding", "Training", "Health", "Vet", "Wash", "Clip", "Show", "Expense", "Other"];
const timelineIcons: Record<string, string> = { Feeding: "🥣", Training: "🏋️", Health: "💊", Vet: "🩺", Wash: "🧼", Clip: "✂️", Show: "🏆", Expense: "💵", Other: "📝" };

function parseBestPlacing(shows: Show[], projectId: number) {
  const placeValues = shows
    .flatMap((show) => show.entries)
    .filter((entry) => entry.project_id === projectId)
    .flatMap((entry) => entry.placings)
    .map((placing) => Number.parseInt(String(placing.placing), 10))
    .filter((value) => Number.isFinite(value));

  if (placeValues.length === 0) {
    return "N/A";
  }
  return `#${Math.min(...placeValues)}`;
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<(typeof sections)[number]>("overview");
  const [project, setProject] = useState<Project | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [showAddTimeline, setShowAddTimeline] = useState(false);
  const [quickType, setQuickType] = useState("Other");
  const [importantIds, setImportantIds] = useState<number[]>([]);

  const load = async () => {
    const id = Number(params.id);
    const [projectData, expenseData, showData, mediaData, timelineData, authData, profileData] = await Promise.all([
      apiClientJson<Project>(`/projects/${id}`),
      apiClientJson<Expense[]>(`/expenses?project_id=${id}`),
      apiClientJson<Show[]>(`/projects/${id}/shows`),
      apiClientJson<MediaItem[]>(`/media?project_id=${id}`),
      apiClientJson<TimelineEntry[]>(`/projects/${id}/timeline`),
      apiClientJson<AuthStatus>("/auth/status"),
      apiClientJson<Profile[]>("/profiles")
    ]);
    setProject(projectData);
    setExpenses(expenseData);
    setShows(showData);
    setMedia(mediaData);
    setTimeline(timelineData.slice(0, 15));
    setAuth(authData);
    setProfiles(profileData);
  };

  useEffect(() => {
    load().catch(() => undefined);
    const saved = window.localStorage.getItem(`timeline-important-${params.id}`);
    if (saved) setImportantIds(JSON.parse(saved));
  }, [params.id]);

  useEffect(() => {
    window.localStorage.setItem(`timeline-important-${params.id}`, JSON.stringify(importantIds));
  }, [importantIds, params.id]);

  const stats = useMemo(() => {
    const projectId = Number(params.id);
    const totalExpenses = expenses.reduce(
      (sum, expense) => sum + expense.allocations.filter((a) => a.project_id === projectId).reduce((inner, a) => inner + a.amount, 0),
      0
    );
    const showsEntered = shows.reduce((sum, show) => sum + show.entries.filter((entry) => entry.project_id === projectId).length, 0);
    const bestPlacing = parseBestPlacing(shows, projectId);
    return { totalExpenses, showsEntered, bestPlacing };
  }, [expenses, shows, params.id]);

  const ownerName = profiles.find((profile) => profile.id === project?.owner_profile_id)?.name ?? "Unknown";

  const addTimeline = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const eventType = String(form.get("type") ?? quickType);
    const note = String(form.get("note") ?? "").trim();
    await apiClientJson(`/projects/${params.id}/timeline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: eventType,
        title: eventType,
        description: note || null,
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

  return <div className="space-y-4 pb-2">
    <h1 className="text-2xl font-semibold">{project.name}</h1>
    <div className="flex gap-2 overflow-x-auto">
      {sections.map((section) => <button key={section} onClick={() => setActiveSection(section)} className={`rounded px-3 py-1 text-sm capitalize ${activeSection === section ? "bg-red-700" : "bg-neutral-800"}`}>{section}</button>)}
    </div>

    {activeSection === "overview" ? <section className="space-y-3 rounded border border-white/10 bg-neutral-900 p-4 text-sm">
      <div className="grid gap-2 md:grid-cols-2">
        <p><span className="text-neutral-400">Species:</span> {project.species}</p>
        <p><span className="text-neutral-400">Owner:</span> {ownerName}</p>
        <p><span className="text-neutral-400">Start date:</span> {project.created_at ? project.created_at.slice(0, 10) : "N/A"}</p>
        <p><span className="text-neutral-400">Tag:</span> {project.tag ?? "N/A"}</p>
      </div>
      <p><span className="text-neutral-400">Notes:</span> {project.notes ?? "No notes yet."}</p>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded bg-neutral-800 p-2">${stats.totalExpenses.toFixed(2)} total expenses</div>
        <div className="rounded bg-neutral-800 p-2">{stats.showsEntered} shows entered</div>
        <div className="rounded bg-neutral-800 p-2">Best placing {stats.bestPlacing}</div>
      </div>
      {auth?.role === "parent" && auth.is_unlocked ? <div className="mt-2 flex gap-2"><Link href={`/projects/${project.id}/edit`} className="rounded bg-neutral-800 px-3 py-2">Edit</Link><button onClick={remove} className="rounded bg-red-800 px-3 py-2">Delete</button></div> : null}
    </section> : null}

    {activeSection === "timeline" ? <section className="space-y-3 rounded border border-white/10 bg-neutral-900 p-4">
      {auth?.role === "parent" && auth.is_unlocked ? <div className="flex items-center justify-between"><h2 className="font-semibold">Timeline</h2><button onClick={() => setShowAddTimeline((prev) => !prev)} className="rounded bg-red-700 px-3 py-2 text-sm">Add entry</button></div> : <h2 className="font-semibold">Timeline</h2>}
      <div className="flex flex-wrap gap-2">{timelineTypes.map((type) => <button key={type} onClick={() => { setQuickType(type); setShowAddTimeline(true); }} className={`rounded px-3 py-1 text-xs ${quickType === type ? "bg-red-700" : "bg-neutral-800"}`}>{timelineIcons[type]} {type}</button>)}</div>
      {showAddTimeline ? <form className="grid gap-2 rounded bg-neutral-800 p-3" onSubmit={addTimeline}><input name="date" type="date" className="rounded bg-neutral-900 p-2" required /><select name="type" value={quickType} onChange={(event) => setQuickType(event.target.value)} className="rounded bg-neutral-900 p-2">{timelineTypes.map((type) => <option key={type}>{type}</option>)}</select><textarea name="note" placeholder="Note" className="rounded bg-neutral-900 p-2" /><div className="flex gap-2"><button className="rounded bg-red-700 px-3 py-2 text-sm">Save entry</button><button type="button" onClick={() => setShowAddTimeline(false)} className="rounded bg-neutral-700 px-3 py-2 text-sm">Cancel</button></div></form> : null}
      {timeline.length === 0 ? <p className="rounded bg-neutral-800 p-3 text-sm text-neutral-300">No timeline entries yet.</p> : null}
      <div className="space-y-2">{timeline.map((item) => <article key={item.id} className="rounded bg-neutral-800 p-3 text-sm"><div className="flex items-center justify-between"><p className="font-medium">{timelineIcons[item.type] ?? "📝"} {item.type}</p><button onClick={() => setImportantIds((prev) => prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id])} className={`rounded px-2 py-1 text-xs ${importantIds.includes(item.id) ? "bg-amber-700" : "bg-neutral-700"}`}>★</button></div><p>{item.date.slice(0, 16).replace("T", " ")}</p><p className="text-neutral-300">{item.description ?? "No note."}</p>{importantIds.includes(item.id) ? <p className="mt-1 text-xs text-amber-300">Marked important (local only)</p> : null}</article>)}</div>
    </section> : null}

    {activeSection === "expenses" ? <section className="space-y-3 rounded border border-white/10 bg-neutral-900 p-4 text-sm">
      <div className="flex items-center justify-between"><h2 className="font-semibold">Expenses</h2><Link href={`/expenses/new?project_id=${project.id}`} className="rounded bg-red-700 px-3 py-2 text-xs">Add expense</Link></div>
      {expenses.length === 0 ? <p className="rounded bg-neutral-800 p-3 text-neutral-300">No expenses logged yet.</p> : null}
      {expenses.map((expense) => {
        const allocated = expense.allocations.filter((a) => a.project_id === Number(params.id)).reduce((sum, a) => sum + a.amount, 0);
        return <Link href={`/expenses/${expense.id}`} key={expense.id} className="block rounded bg-neutral-800 p-3">{expense.date.slice(0, 10)} • ${allocated.toFixed(2)} • {expense.category}</Link>;
      })}
    </section> : null}

    {activeSection === "media" ? <section className="space-y-3 rounded border border-white/10 bg-neutral-900 p-4">
      <h2 className="font-semibold">Media</h2>
      {media.length === 0 ? <p className="rounded bg-neutral-800 p-3 text-sm text-neutral-300">No media uploaded yet. Upload support will appear here when entries are available.</p> : null}
      <div className="grid grid-cols-2 gap-2">{media.map((item) => <div key={item.id} className="rounded bg-neutral-800 p-2"><img src={item.url} alt={item.caption ?? item.file_name} className="h-28 w-full rounded object-cover" /><p className="text-xs text-neutral-300">{item.caption ?? item.file_name}</p></div>)}</div>
    </section> : null}
  </div>;
}
