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

    try {
      setMedia(await apiClientJson<MediaItem[]>(`/media?project_id=${id}`));
      setMediaAvailable(true);
    } catch {
      setMedia([]);
      setMediaAvailable(false);
    }

    try {
      setTasks(await apiClientJson<TaskItem[]>(`/projects/${id}/tasks`));
      setTasksAvailable(true);
    } catch {
      setTasks([]);
      setTasksAvailable(false);
    }

    setProject(projectData);
    setExpenses(expenseData);
    setShows(showData);
    setTimeline(timelineData);
    setAuth(authData);
    setProfiles(profileData);
    setPlacings(placingData);
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [params.id]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && sections.includes(tab as (typeof sections)[number])) {
      setActiveSection(tab as (typeof sections)[number]);
    }
  }, [searchParams]);

  const ownerName = profiles.find((profile) => profile.id === project?.owner_profile_id)?.name ?? "Unknown";
  const totalExpenses = useMemo(
    () => expenses.reduce((sum, expense) => sum + expense.allocations.reduce((inner, row) => inner + row.amount, 0), 0),
    [expenses]
  );
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

  const toggleTask = async (taskId: number) => {
    await apiClientJson(`/tasks/${taskId}/toggle`, { method: "POST" });
    await load();
  };

  const remove = async () => {
    await apiClientJson(`/projects/${params.id}`, { method: "DELETE" });
    router.push("/projects");
  };

  if (!project) return <p className="px-4">Loading project...</p>;

  return (
    <div className="w-full space-y-4 px-4 pb-5">
      <section className="barn-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{project.name}</h1>
            <p className="text-sm capitalize text-[var(--barn-muted)]">{project.species} • {ownerName}</p>
            <p className="mt-1 text-xs text-[var(--barn-muted)]">Tag: {project.tag ?? "—"} • Status: {project.status}</p>
          </div>
          {projectPhoto ? <img src={projectPhoto} alt={`${project.name} photo`} className="h-24 w-24 rounded-lg object-cover" /> : null}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <article className="barn-chip">{timeline.length}<span>Timeline</span></article>
          <article className="barn-chip">${totalExpenses.toFixed(2)}<span>Expenses</span></article>
          <article className="barn-chip">{placings.length}<span>Placings</span></article>
        </div>
      </section>

      <section className="barn-card">
        <div className="flex flex-wrap gap-2">
          {sections.map((section) => (
            <button
              key={section}
              type="button"
              onClick={() => setActiveSection(section)}
              className={`rounded-full px-3 py-1.5 text-xs capitalize ${activeSection === section ? "bg-[var(--barn-red)] text-white" : "bg-[var(--barn-bg)]"}`}
            >
              {section}
            </button>
          ))}
        </div>
      </section>

      {activeSection === "overview" ? (
        <section className="barn-card space-y-3 text-sm">
          <h2 className="text-base font-medium">Overview</h2>
          <p className="text-[var(--barn-muted)]">{project.notes || "No project notes yet."}</p>
          <div className="grid grid-cols-2 gap-2">
            <Link href={`/expenses/new?projectId=${project.id}`} className="quick-action-card">Add Expense</Link>
            <Link href={`/shows/new?projectId=${project.id}`} className="quick-action-card">Add Show Entry</Link>
            <Link href={`/projects/${project.id}/weights`} className="quick-action-card">Log Weight</Link>
            <Link href={`/projects/${project.id}/health`} className="quick-action-card">Log Health</Link>
          </div>
          {auth?.role === "parent" && auth.is_unlocked ? (
            <div className="flex gap-2">
              <Link href={`/projects/${project.id}/edit`} className="rounded bg-[var(--barn-bg)] px-3 py-2">Edit</Link>
              <button onClick={remove} className="rounded bg-red-900 px-3 py-2">Delete</button>
            </div>
          ) : null}
        </section>
      ) : null}

      {activeSection === "timeline" ? (
        <section className="barn-card space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium">Timeline</h2>
            <button onClick={() => setShowAddTimeline((prev) => !prev)} className="rounded bg-[var(--barn-red)] px-3 py-1.5 text-xs">Add entry</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {timelineTypes.map((type) => (
              <button key={type} onClick={() => setQuickType(type)} className={`rounded px-2 py-1 text-xs ${quickType === type ? "bg-[var(--barn-red)]" : "bg-[var(--barn-bg)]"}`}>{type}</button>
            ))}
          </div>
          {showAddTimeline ? (
            <form className="grid gap-2 rounded-lg bg-[var(--barn-bg)] p-3" onSubmit={addTimeline}>
              <input name="date" type="date" className="rounded bg-black/20 p-2" required />
              <input name="title" placeholder="Title" className="rounded bg-black/20 p-2" />
              <select name="type" value={quickType} onChange={(event) => setQuickType(event.target.value)} className="rounded bg-black/20 p-2">
                {timelineTypes.map((type) => <option key={type}>{type}</option>)}
              </select>
              <textarea name="note" placeholder="Note" className="rounded bg-black/20 p-2" />
              <button className="rounded bg-[var(--barn-red)] px-3 py-2 text-sm">Save entry</button>
            </form>
          ) : null}
          {timeline.length === 0 ? <p className="barn-row text-[var(--barn-muted)]">No timeline entries yet.</p> : timeline.map((item) => <article key={item.id} className="barn-row"><p className="font-medium">{item.title}</p><p className="text-xs text-[var(--barn-muted)]">{item.date.slice(0, 10)} • {item.type}</p><p className="text-sm text-[var(--barn-muted)]">{item.description ?? "No note"}</p></article>)}
        </section>
      ) : null}

      {activeSection === "expenses" ? (
        <section className="barn-card space-y-3 text-sm">
          <div className="flex items-center justify-between"><h2 className="text-base font-medium">Expenses</h2><Link href={`/expenses/new?projectId=${project.id}`} className="rounded bg-[var(--barn-red)] px-3 py-2 text-xs">Add expense</Link></div>
          {expenses.length === 0 ? <p className="barn-row text-[var(--barn-muted)]">No expenses logged yet.</p> : expenses.map((expense) => <article key={expense.id} className="barn-row"><p>{expense.date.slice(0, 10)} • {expense.vendor ?? "No vendor"} • ${expense.amount.toFixed(2)}</p><p className="text-xs text-[var(--barn-muted)]">{expense.receipt_count > 0 ? "Receipt attached" : "No receipt"} • {expense.is_split ? "Split allocation" : "Single allocation"}</p><Link href={`/expenses/${expense.id}`} className="see-all-link">View expense</Link></article>)}
        </section>
      ) : null}

      {activeSection === "shows" ? (
        <section className="barn-card space-y-3 text-sm">
          <h2 className="text-base font-medium">Shows</h2>
          {shows.length === 0 ? <p className="barn-row text-[var(--barn-muted)]">No shows for this project yet.</p> : shows.map((show) => <article key={show.id} className="barn-row"><p className="font-medium">{show.name}</p><p>{show.start_date.slice(0, 10)} • {show.location}</p><p className="text-xs text-[var(--barn-muted)]">Placings: {show.entries.flatMap((entry) => entry.placings).map((placing) => placing.placing).join(", ") || "Not recorded"}</p><div className="mt-1 flex gap-2"><Link href={`/shows/${show.id}`} className="see-all-link">View show</Link><Link href={`/shows/${show.id}/day`} className="see-all-link">Day mode</Link></div></article>)}
        </section>
      ) : null}

      {activeSection === "media" ? (
        <section className="barn-card space-y-3 text-sm">
          <h2 className="text-base font-medium">Media</h2>
          {!mediaAvailable ? <p className="barn-row text-[var(--barn-muted)]">Media endpoint is unavailable in this environment.</p> : null}
          {mediaAvailable && media.length === 0 ? <p className="barn-row text-[var(--barn-muted)]">No media uploaded for this project yet.</p> : null}
          {mediaAvailable && media.length > 0 ? <div className="grid grid-cols-2 gap-2 md:grid-cols-3">{media.map((item) => <ShowsMediaCard key={item.id} item={item} />)}</div> : null}
        </section>
      ) : null}

      {activeSection === "tasks" ? (
        <section className="barn-card space-y-3 text-sm">
          <h2 className="text-base font-medium">Tasks</h2>
          {!tasksAvailable ? <p className="barn-row text-[var(--barn-muted)]">Tasks endpoint is unavailable in this environment.</p> : null}
          {tasksAvailable && tasks.length === 0 ? <p className="barn-row text-[var(--barn-muted)]">No tasks for this project yet.</p> : null}
          {tasksAvailable && tasks.length > 0 ? tasks.map((task) => <article key={task.id} className="barn-row"><div className="flex items-center justify-between"><p className={task.status === "done" ? "line-through" : ""}>{task.title}</p><button onClick={() => toggleTask(task.id)} className="rounded bg-[var(--barn-surface)] px-2 py-1 text-xs">{task.status === "done" ? "Undo" : "Done"}</button></div><p className="text-xs text-[var(--barn-muted)]">{task.priority} • Due {task.due_date ? task.due_date.slice(0, 10) : "No date"}</p></article>) : null}
        </section>
      ) : null}
    </div>
  );
}
