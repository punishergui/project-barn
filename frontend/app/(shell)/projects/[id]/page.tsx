"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { apiClientJson, AuthStatus, CareEntry, Expense, FeedEntry, MediaItem, Placing, Profile, Project, ProjectTask, Show, TimelineEntry, WeightEntry } from "@/lib/api";
import { uploadProjectHero, uploadProjectMedia } from "@/lib/uploads";
import { ShowsMediaCard } from "@/components/shows-media-card";

const sections = ["overview", "feed", "timeline", "expenses", "shows", "media", "tasks"] as const;
const timelineTypes = ["Feeding", "Training", "Health", "Vet", "Wash", "Clip", "Show", "Expense", "Other"];

function formatDate(value?: string | null) {
  if (!value) return "No date";
  return new Date(value).toLocaleDateString();
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeSection, setActiveSection] = useState<(typeof sections)[number]>("overview");
  const [project, setProject] = useState<Project | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [placings, setPlacings] = useState<Placing[]>([]);
  const [feedEntries, setFeedEntries] = useState<FeedEntry[]>([]);
  const [careEntries, setCareEntries] = useState<CareEntry[]>([]);
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [mediaCaption, setMediaCaption] = useState("");
  const [showAddTimeline, setShowAddTimeline] = useState(false);
  const [quickType, setQuickType] = useState("Other");

  const load = async () => {
    const id = Number(params.id);
    const [projectData, profileData, expenseData, showData, timelineData, taskData, mediaData, placingData, authData, weightData, feedData, careData] = await Promise.all([
      apiClientJson<Project>(`/projects/${id}`),
      apiClientJson<Profile[]>("/profiles"),
      apiClientJson<Expense[]>(`/expenses?project_id=${id}`),
      apiClientJson<Show[]>(`/projects/${id}/shows`),
      apiClientJson<TimelineEntry[]>(`/projects/${id}/timeline`),
      apiClientJson<ProjectTask[]>(`/projects/${id}/tasks`).catch(() => []),
      apiClientJson<MediaItem[]>(`/media?project_id=${id}`).catch(() => []),
      apiClientJson<Placing[]>(`/projects/${id}/placings`).catch(() => []),
      apiClientJson<AuthStatus>("/auth/status").catch(() => null),
      apiClientJson<WeightEntry[]>(`/projects/${id}/weights`).catch(() => []),
      apiClientJson<FeedEntry[]>(`/projects/${id}/feed`).catch(() => []),
      apiClientJson<CareEntry[]>(`/projects/${id}/care`).catch(() => [])
    ]);

    setProject(projectData);
    setProfiles(profileData);
    setExpenses(expenseData);
    setShows(showData);
    setTimeline(timelineData);
    setTasks(taskData);
    setMedia(mediaData);
    setPlacings(placingData);
    setAuth(authData);
    setWeights(weightData);
    setFeedEntries(feedData);
    setCareEntries(careData);
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

  const ownerName = profiles.find((profile) => profile.id === project?.owner_profile_id)?.name ?? "Unknown owner";
  const totalExpenses = useMemo(() => expenses.reduce((sum, row) => sum + row.amount, 0), [expenses]);
  const latestWeight = weights[0]?.weight_lbs ?? null;
  const latestFeedDate = feedEntries[0]?.recorded_at ?? null;
  const feedTotal = feedEntries.reduce((sum, row) => sum + (row.cost ?? 0), 0);
  const projectPhoto = project?.photo_url ?? media[0]?.url ?? null;

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

  const handleHeroUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadProjectHero(Number(params.id), file);
    event.target.value = "";
    await load();
  };

  const handleMediaUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadProjectMedia(Number(params.id), file, mediaCaption);
    event.target.value = "";
    setMediaCaption("");
    await load();
  };

  const toggleTask = async (task: ProjectTask) => {
    const endpoint = task.is_completed ? "uncomplete" : "complete";
    await apiClientJson(`/projects/${params.id}/tasks/${task.id}/${endpoint}`, { method: "POST" });
    await load();
  };

  const removeProject = async () => {
    await apiClientJson(`/projects/${params.id}`, { method: "DELETE" });
    router.push("/projects");
  };

  if (!project) {
    return <p className="px-4 py-6 text-sm text-[var(--barn-muted)]">Loading project...</p>;
  }

  return (
    <div className="w-full space-y-4 px-4 pb-6">
      <section className="barn-card space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{project.name}</h1>
            <p className="text-sm capitalize text-[var(--barn-muted)]">{project.species} • {ownerName}</p>
            <p className="text-xs text-[var(--barn-muted)]">Tag {project.tag || "—"} • Status {project.status}</p>
          </div>
          <Link href={`/projects/${project.id}/edit`} className="see-all-link">Edit</Link>
        </div>

        <div className="overflow-hidden rounded-xl border border-[var(--barn-border)] bg-[var(--barn-bg)]">
          {projectPhoto ? <img src={projectPhoto} alt={`${project.name} hero`} className="h-48 w-full object-cover" /> : <div className="flex h-48 items-center justify-center text-sm text-[var(--barn-muted)]">No hero image yet</div>}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <article className="rounded-lg border border-[var(--barn-border)] bg-[var(--barn-bg)] p-2">Total expenses<br /><span className="text-sm font-semibold">${totalExpenses.toFixed(2)}</span></article>
          <article className="rounded-lg border border-[var(--barn-border)] bg-[var(--barn-bg)] p-2">Timeline entries<br /><span className="text-sm font-semibold">{timeline.length}</span></article>
          <article className="rounded-lg border border-[var(--barn-border)] bg-[var(--barn-bg)] p-2">Shows<br /><span className="text-sm font-semibold">{shows.length}</span></article>
          <article className="rounded-lg border border-[var(--barn-border)] bg-[var(--barn-bg)] p-2">Feed cost<br /><span className="text-sm font-semibold">${feedTotal.toFixed(2)}</span></article>
          <article className="rounded-lg border border-[var(--barn-border)] bg-[var(--barn-bg)] p-2">Latest feeding<br /><span className="text-sm font-semibold">{latestFeedDate ? formatDate(latestFeedDate) : "Not logged"}</span></article>
          <article className="rounded-lg border border-[var(--barn-border)] bg-[var(--barn-bg)] p-2">Current weight<br /><span className="text-sm font-semibold">{latestWeight ? `${latestWeight} lbs` : "Not set"}</span></article>
        </div>

        <div className="flex flex-wrap gap-2">
          <label className="rounded-lg border border-[var(--barn-border)] bg-[var(--barn-bg)] px-3 py-2 text-xs">
            Upload Hero
            <input type="file" accept="image/*" className="hidden" onChange={(event) => handleHeroUpload(event).catch(() => undefined)} />
          </label>
          {auth?.role === "parent" && auth.is_unlocked ? <button type="button" onClick={() => removeProject().catch(() => undefined)} className="rounded-lg border border-red-500/40 bg-red-500/20 px-3 py-2 text-xs text-red-100">Delete Project</button> : null}
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-xl border border-[var(--barn-border)] bg-[var(--barn-bg)] p-2">
          {sections.map((section) => (
            <button
              key={section}
              type="button"
              onClick={() => setActiveSection(section)}
              className={`rounded-lg px-2 py-2 text-xs font-medium capitalize ${activeSection === section ? "bg-[var(--barn-red)] text-white" : "bg-black/20 text-[var(--barn-muted)]"}`}
            >
              {section}
            </button>
          ))}
        </div>
      </section>

      {activeSection === "overview" ? (
        <section className="barn-card space-y-3 text-sm">
          <h2 className="text-base font-semibold">Overview</h2>
          {project.notes ? <p className="barn-row">{project.notes}</p> : <p className="barn-row text-[var(--barn-muted)]">No notes added yet.</p>}
          <div className="grid gap-2 sm:grid-cols-2">
            <article className="barn-row">
              <p className="font-medium">Recent weigh-ins</p>
              {weights.length === 0 ? <p className="text-xs text-[var(--barn-muted)]">No weight entries yet.</p> : weights.slice(0, 3).map((row) => <p key={row.id} className="text-xs text-[var(--barn-muted)]">{formatDate(row.recorded_at)} • {row.weight_lbs} lbs</p>)}
            </article>
            <article className="barn-row">
              <p className="font-medium">Recent placings</p>
              {placings.length === 0 ? <p className="text-xs text-[var(--barn-muted)]">No placings recorded yet.</p> : placings.slice(0, 3).map((row) => <p key={row.id} className="text-xs text-[var(--barn-muted)]">{row.placing} • {row.class_name || "Class"}</p>)}
            </article>
          </div>
        </section>
      ) : null}


      {activeSection === "feed" ? (
        <section className="barn-card space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Feed & Care</h2>
            <Link href={`/projects/${project.id}/feed`} className="rounded bg-[var(--barn-red)] px-3 py-2 text-xs">Log Feed</Link>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/projects/${project.id}/feed`} className="rounded-lg border border-[var(--barn-border)] bg-[var(--barn-bg)] px-3 py-2 text-xs">Log Feed</Link>
            <Link href={`/projects/${project.id}/feed`} className="rounded-lg border border-[var(--barn-border)] bg-[var(--barn-bg)] px-3 py-2 text-xs">Add Care Entry</Link>
          </div>
          <article className="barn-row">
            <p className="font-medium">Recent feed entries</p>
            {feedEntries.length === 0 ? <p className="text-xs text-[var(--barn-muted)]">No feed entries yet.</p> : feedEntries.slice(0, 4).map((row) => <p key={row.id} className="text-xs text-[var(--barn-muted)]">{formatDate(row.recorded_at)} • {row.feed_type} • {row.amount} {row.unit}</p>)}
          </article>
          <article className="barn-row">
            <p className="font-medium">Recent care entries</p>
            {careEntries.length === 0 ? <p className="text-xs text-[var(--barn-muted)]">No care entries yet.</p> : careEntries.slice(0, 4).map((row) => <p key={row.id} className="text-xs text-[var(--barn-muted)]">{formatDate(row.recorded_at)} • {row.label}</p>)}
          </article>
        </section>
      ) : null}

      {activeSection === "timeline" ? (
        <section className="barn-card space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Timeline</h2>
            <button type="button" onClick={() => setShowAddTimeline((prev) => !prev)} className="rounded bg-[var(--barn-red)] px-3 py-1.5 text-xs">Add entry</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {timelineTypes.map((type) => (
              <button key={type} type="button" onClick={() => setQuickType(type)} className={`rounded px-2 py-1 text-xs ${quickType === type ? "bg-[var(--barn-red)] text-white" : "bg-[var(--barn-bg)]"}`}>{type}</button>
            ))}
          </div>
          {showAddTimeline ? (
            <form className="grid gap-2 rounded-lg bg-[var(--barn-bg)] p-3" onSubmit={(event) => addTimeline(event).catch(() => undefined)}>
              <input name="date" type="date" className="rounded bg-black/20 p-2" required />
              <input name="title" placeholder="Title" className="rounded bg-black/20 p-2" />
              <select name="type" value={quickType} onChange={(event) => setQuickType(event.target.value)} className="rounded bg-black/20 p-2">
                {timelineTypes.map((type) => <option key={type}>{type}</option>)}
              </select>
              <textarea name="note" placeholder="Note" className="rounded bg-black/20 p-2" />
              <button className="rounded bg-[var(--barn-red)] px-3 py-2 text-sm">Save entry</button>
            </form>
          ) : null}
          {timeline.length === 0 ? <p className="barn-row text-[var(--barn-muted)]">No timeline entries yet.</p> : timeline.map((item) => <article key={item.id} className="barn-row"><p className="font-medium">{item.title}</p><p className="text-xs text-[var(--barn-muted)]">{formatDate(item.date)} • {item.type}</p><p className="text-sm text-[var(--barn-muted)]">{item.description ?? "No note"}</p></article>)}
        </section>
      ) : null}

      {activeSection === "expenses" ? (
        <section className="barn-card space-y-3 text-sm">
          <div className="flex items-center justify-between"><h2 className="text-base font-semibold">Expenses</h2><Link href={`/expenses/new?projectId=${project.id}`} className="rounded bg-[var(--barn-red)] px-3 py-2 text-xs">Add expense</Link></div>
          {expenses.length === 0 ? <p className="barn-row text-[var(--barn-muted)]">No expenses logged yet.</p> : expenses.map((expense) => <Link key={expense.id} href={`/expenses/${expense.id}`} className="barn-row block"><p className="font-medium">${expense.amount.toFixed(2)} • {expense.vendor ?? expense.category}</p><p className="text-xs text-[var(--barn-muted)]">{formatDate(expense.date)} • {expense.receipt_count > 0 ? "Receipt attached" : "No receipt"}</p></Link>)}
        </section>
      ) : null}

      {activeSection === "shows" ? (
        <section className="barn-card space-y-3 text-sm">
          <h2 className="text-base font-semibold">Shows</h2>
          {shows.length === 0 ? <p className="barn-row text-[var(--barn-muted)]">No shows for this project yet.</p> : shows.map((show) => {
            const showPlacings = placings.filter((placing) => placing.show_id === show.id);
            return <Link key={show.id} href={`/shows/${show.id}`} className="barn-row block space-y-1"><p className="font-medium">{show.name}</p><p className="text-xs text-[var(--barn-muted)]">{formatDate(show.start_date)} • {show.location}</p>{showPlacings.length === 0 ? <p className="text-xs text-[var(--barn-muted)]">No placings recorded yet.</p> : showPlacings.map((placing) => <p key={placing.id} className="text-xs text-[var(--barn-muted)]">{placing.class_name || "Class"} • {placing.placing} • {placing.ribbon_type || "Ribbon"}</p>)}</Link>;
          })}
        </section>
      ) : null}

      {activeSection === "media" ? (
        <section className="barn-card space-y-3 text-sm">
          <h2 className="text-base font-semibold">Media</h2>
          <div className="flex flex-wrap items-center gap-2"><input value={mediaCaption} onChange={(event) => setMediaCaption(event.target.value)} placeholder="Caption" className="rounded bg-[var(--barn-bg)] px-3 py-2" /><label className="rounded bg-[var(--barn-red)] px-3 py-2 text-xs">Add Media<input type="file" accept="image/*,video/*" className="hidden" onChange={(event) => handleMediaUpload(event).catch(() => undefined)} /></label></div>
          {media.length === 0 ? <p className="barn-row text-[var(--barn-muted)]">No media uploaded for this project yet.</p> : <div className="grid grid-cols-2 gap-2 md:grid-cols-3">{media.map((item) => <ShowsMediaCard key={item.id} item={item} />)}</div>}
        </section>
      ) : null}

      {activeSection === "tasks" ? (
        <section className="barn-card space-y-3 text-sm">
          <h2 className="text-base font-semibold">Tasks</h2>
          {tasks.length === 0 ? <p className="barn-row text-[var(--barn-muted)]">No tasks yet. Add tasks from your project workflow to track daily progress.</p> : tasks.map((task) => <article key={task.id} className="barn-row"><div className="flex items-center justify-between gap-2"><p className={task.is_completed ? "line-through" : ""}>{task.title}</p><button type="button" onClick={() => toggleTask(task).catch(() => undefined)} className="rounded bg-[var(--barn-surface)] px-2 py-1 text-xs">{task.is_completed ? "Mark open" : "Mark done"}</button></div><p className="text-xs text-[var(--barn-muted)]">Due {formatDate(task.due_date)} • {task.is_daily ? "Daily" : "One-time"}</p></article>)}
        </section>
      ) : null}
    </div>
  );
}
