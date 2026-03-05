"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { apiClientJson, AuthStatus, Expense, MediaItem, Placing, Profile, Project, Show, TaskItem, TimelineEntry } from "@/lib/api";
import { ShowsMediaCard } from "@/components/shows-media-card";

const sections = ["overview", "timeline", "expenses", "shows", "media", "tasks"] as const;
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
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [mediaAvailable, setMediaAvailable] = useState(true);
  const [placings, setPlacings] = useState<Placing[]>([]);
  const [tasksAvailable, setTasksAvailable] = useState(true);
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [showAddTimeline, setShowAddTimeline] = useState(false);
  const [quickType, setQuickType] = useState("Other");

  const load = async () => {
    const id = Number(params.id);
    const [projectData, expenseData, showData, timelineData, authData, profileData, placingData] = await Promise.all([
      apiClientJson<Project>(`/projects/${id}`),
      apiClientJson<Expense[]>(`/expenses?project_id=${id}`),
      apiClientJson<Show[]>(`/projects/${id}/shows`),
      apiClientJson<TimelineEntry[]>(`/projects/${id}/timeline`),
      apiClientJson<AuthStatus>("/auth/status"),
      apiClientJson<Profile[]>("/profiles"),
      apiClientJson<Placing[]>(`/projects/${id}/placings`).catch(() => [])
    ]);

    let mediaData: MediaItem[] = [];
    let taskData: TaskItem[] = [];

    try {
      mediaData = await apiClientJson<MediaItem[]>(`/media?project_id=${id}`);
      setMediaAvailable(true);
    } catch {
      setMediaAvailable(false);
    }

    try {
      taskData = await apiClientJson<TaskItem[]>(`/projects/${id}/tasks`);
      setTasksAvailable(true);
    } catch {
      setTasksAvailable(false);
    }

    setProject(projectData);
    setExpenses(expenseData);
    setShows(showData);
    setTimeline(timelineData);
    setMedia(mediaData);
    setTasks(taskData);
    setAuth(authData);
    setProfiles(profileData);
    setPlacings(placingData);
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

  const bestPlacing = useMemo(() => {
    const placings = shows
      .flatMap((show) => show.entries)
      .flatMap((entry) => entry.placings)
      .map((placing) => Number(placing.placing))
      .filter((placing) => !Number.isNaN(placing));

    if (placings.length === 0) {
      return "—";
    }

    return `${Math.min(...placings)} place`;
  }, [shows]);

  const timelineItems = useMemo(() => timeline.slice(0, 25), [timeline]);
  const projectPhoto = media[0]?.url ?? null;

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
      <header className="rounded-xl border border-white/10 bg-neutral-900 p-4 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold md:text-4xl">{project.name}</h1>
            <p className="text-sm capitalize text-neutral-300">{project.species} • {ownerName}</p>
            <p className="text-xs text-amber-300">Ribbon count: {placings.filter((p) => p.ribbon_type).length} • Recent placings: {placings.slice(0, 3).map((p) => p.placing).join(", ") || "—"}</p>
          </div>
          {projectPhoto ? (
            <img src={projectPhoto} alt={`${project.name} photo`} className="h-24 w-24 rounded-lg object-cover md:h-28 md:w-28" />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-neutral-800 text-xs text-neutral-400 md:h-28 md:w-28">No photo</div>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
          <p className="rounded-lg bg-neutral-800 p-3"><span className="block text-xs text-neutral-400">Total expenses</span>${totalExpenses.toFixed(2)}</p>
          <p className="rounded-lg bg-neutral-800 p-3"><span className="block text-xs text-neutral-400">Shows entered</span>{shows.length}</p>
          <p className="rounded-lg bg-neutral-800 p-3"><span className="block text-xs text-neutral-400">Best placing</span>{bestPlacing}</p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Link href={`/expenses/new?projectId=${project.id}`} className="rounded bg-red-700 px-4 py-3 text-center font-medium">Add Expense</Link>
          <button onClick={() => { setActiveSection("timeline"); setShowAddTimeline(true); }} className="rounded bg-neutral-800 px-4 py-3 font-medium">Add Timeline Entry</button>
          <Link href={upcomingShow ? `/shows/${upcomingShow.id}/day` : "/shows"} className="rounded bg-neutral-800 px-4 py-3 text-center font-medium">{upcomingShow ? "Open Show Day Mode" : "Show Day Unavailable"}</Link>
          <button onClick={() => setActiveSection("media")} className="rounded bg-neutral-800 px-4 py-3 font-medium">View Media</button>
        </div>
      

        <div className="mt-4 rounded-lg border border-white/10 bg-neutral-800 p-3">
          <p className="mb-2 text-xs uppercase text-neutral-400">Quick Actions</p>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link href={`/projects/${project.id}/tasks`} className="rounded bg-neutral-700 px-3 py-1">Tasks</Link>
            <Link href={`/projects/${project.id}/weights`} className="rounded bg-neutral-700 px-3 py-1">Weights</Link>
            <Link href={`/projects/${project.id}/health`} className="rounded bg-neutral-700 px-3 py-1">Health</Link>
            <Link href={`/projects/${project.id}/feed`} className="rounded bg-neutral-700 px-3 py-1">Feed</Link>
          </div>
        </div>
</header>

      <div className="flex gap-2 overflow-x-auto">
        {sections.map((section) => <button key={section} onClick={() => setActiveSection(section)} className={`rounded-full px-3 py-1.5 text-sm capitalize ${activeSection === section ? "bg-red-700" : "bg-neutral-800"}`}>{section}</button>)}
      </div>

      {activeSection === "overview" ? <section className="space-y-3 rounded-xl border border-white/10 bg-neutral-900 p-4 text-sm">
        <h2 className="text-base font-semibold">Overview</h2>
        <div className="grid gap-2 md:grid-cols-2">
          <p><span className="text-neutral-400">Animal name:</span> {project.name}</p>
          <p><span className="text-neutral-400">Species:</span> {project.species}</p>
          <p><span className="text-neutral-400">Owner:</span> {ownerName}</p>
          <p><span className="text-neutral-400">Tag:</span> {project.tag ?? "N/A"}</p>
          <p><span className="text-neutral-400">Status:</span> <span className="capitalize">{project.status}</span></p>
          <p><span className="text-neutral-400">Total spent:</span> ${totalExpenses.toFixed(2)}</p>
          <p><span className="text-neutral-400">Total shows:</span> {shows.length}</p>
          <p><span className="text-neutral-400">Best placing:</span> {bestPlacing}</p>
        </div>
        <p><span className="text-neutral-400">Notes:</span> {project.notes ?? "No notes yet."}</p>
        <div className="rounded-lg bg-neutral-800 p-3">
          <h3 className="font-medium">Upcoming show</h3>
          {upcomingShow ? <p className="mt-1">{upcomingShow.start_date.slice(0, 10)} • {upcomingShow.name} • <Link className="underline" href={`/shows/${upcomingShow.id}`}>View show</Link></p> : <p className="mt-1 text-neutral-300">No upcoming shows for this project.</p>}
        </div>
        {auth?.role === "parent" && auth.is_unlocked ? <div className="flex gap-2"><Link href={`/projects/${project.id}/edit`} className="rounded bg-neutral-800 px-3 py-2">Edit</Link><button onClick={remove} className="rounded bg-red-900 px-3 py-2">Delete</button></div> : null}
      </section> : null}

      {activeSection === "timeline" ? <section className="space-y-3 rounded-xl border border-white/10 bg-neutral-900 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Timeline</h2>
          <button onClick={() => setShowAddTimeline((prev) => !prev)} className="rounded bg-red-700 px-3 py-1.5 text-sm">Add entry</button>
        </div>
        <div className="flex flex-wrap gap-2">{timelineTypes.map((type) => <button key={type} onClick={() => { setQuickType(type); setShowAddTimeline(true); }} className={`rounded px-2 py-1 text-xs ${quickType === type ? "bg-red-700" : "bg-neutral-800"}`}>{type}</button>)}</div>
        {showAddTimeline ? <form className="grid gap-2 rounded bg-neutral-800 p-3" onSubmit={addTimeline}><input name="date" type="date" className="rounded bg-neutral-900 p-2" required /><input name="title" placeholder="Title" className="rounded bg-neutral-900 p-2" /><select name="type" value={quickType} onChange={(event) => setQuickType(event.target.value)} className="rounded bg-neutral-900 p-2">{timelineTypes.map((type) => <option key={type}>{type}</option>)}</select><textarea name="note" placeholder="Note" className="rounded bg-neutral-900 p-2" /><button className="rounded bg-red-700 px-3 py-2 text-sm">Save entry</button></form> : null}
        {timelineItems.length === 0 ? <p className="rounded bg-neutral-800 p-3 text-sm text-neutral-300">No timeline entries yet.</p> : timelineItems.map((item) => <article key={item.id} className="rounded bg-neutral-800 p-3 text-sm"><div className="flex items-center justify-between gap-3"><p className="font-medium">{item.title}</p>{item.description?.includes("/uploads/") ? <span className="rounded bg-neutral-700 px-2 py-0.5 text-[11px]">Attachment</span> : null}</div><p className="text-xs text-neutral-400">{item.date.slice(0, 10)} • {item.type}</p><p className="text-neutral-300">{item.description ?? "No note."}</p></article>)}
      </section> : null}

      {activeSection === "expenses" ? <section className="space-y-3 rounded-xl border border-white/10 bg-neutral-900 p-4 text-sm">
        <div className="flex items-center justify-between"><h2 className="font-semibold">Expenses</h2><Link href={`/expenses/new?projectId=${project.id}`} className="rounded bg-red-700 px-3 py-2 text-xs">Add expense</Link></div>
        {expenses.length === 0 ? <p className="rounded bg-neutral-800 p-3 text-neutral-300">No expenses logged yet.</p> : expenses.map((expense) => <article key={expense.id} className="space-y-2 rounded bg-neutral-800 p-3"><p>{expense.date.slice(0, 10)} • {expense.vendor ?? "No vendor"} • ${expense.amount.toFixed(2)}</p><p className="text-xs text-neutral-400">{expense.receipt_count > 0 ? "Receipt attached" : "No receipt"} • {expense.is_split ? "Split allocation" : "Single allocation"}</p><Link href={`/expenses/${expense.id}`} className="inline-block rounded bg-neutral-700 px-3 py-1.5 text-xs">View Expense</Link></article>)}
      </section> : null}

      {activeSection === "shows" ? <section className="space-y-3 rounded-xl border border-white/10 bg-neutral-900 p-4 text-sm">
        <h2 className="font-semibold">Shows</h2>
        {shows.length === 0 ? <p className="rounded bg-neutral-800 p-3 text-neutral-300">No shows for this animal yet.</p> : shows.map((show) => <article key={show.id} className="space-y-2 rounded bg-neutral-800 p-3"><p className="font-medium">{show.name}</p><p>{show.start_date.slice(0, 10)} • {show.location}</p><p className="text-xs text-neutral-400">Placing: {show.entries.flatMap((entry) => entry.placings).map((placing) => placing.placing).join(", ") || "Not recorded"}</p><div className="flex gap-2"><Link href={`/shows/${show.id}`} className="rounded bg-neutral-700 px-3 py-1.5 text-xs">View show</Link><Link href={`/shows/${show.id}`} className="rounded bg-neutral-700 px-3 py-1.5 text-xs">Enter placing</Link></div></article>)}
      </section> : null}

      {activeSection === "media" ? <section className="space-y-3 rounded-xl border border-white/10 bg-neutral-900 p-4 text-sm">
        <h2 className="font-semibold">Media</h2>
        {!mediaAvailable ? <p className="rounded bg-neutral-800 p-3 text-neutral-300">Media endpoint is unavailable for this environment.</p> : null}
        {mediaAvailable && media.length === 0 ? <p className="rounded bg-neutral-800 p-3 text-neutral-300">No media uploaded for this project yet.</p> : null}
        {mediaAvailable && media.length > 0 ? <div className="grid grid-cols-2 gap-2 md:grid-cols-3">{media.map((item) => <ShowsMediaCard key={item.id} item={item} />)}</div> : null}
      </section> : null}

      {activeSection === "tasks" ? <section className="space-y-3 rounded-xl border border-white/10 bg-neutral-900 p-4 text-sm">
        <h2 className="font-semibold">Tasks</h2>
        {!tasksAvailable ? <p className="rounded bg-neutral-800 p-3 text-neutral-300">Tasks endpoint is unavailable for this environment.</p> : null}
        {tasksAvailable && tasks.length === 0 ? <p className="rounded bg-neutral-800 p-3 text-neutral-300">No tasks tied to this project yet.</p> : null}
        {tasksAvailable && tasks.length > 0 ? tasks.map((task) => <article key={task.id} className="rounded bg-neutral-800 p-3"><p className="font-medium">{task.title}</p><p className="text-xs text-neutral-400">Status: {task.status} • Due: {task.due_date ?? "No due date"}</p>{task.notes ? <p className="text-neutral-300">{task.notes}</p> : null}</article>) : null}
      </section> : null}
    </div>
  );
}
