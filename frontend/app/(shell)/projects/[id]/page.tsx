"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import {
  apiClientJson,
  AuthStatus,
  ChecklistResponse,
  Expense,
  FeedEntry,
  MediaItem,
  Placing,
  Profile,
  Project,
  ProjectFinancialSummary,
  ProjectMaterial,
  ProjectReminder,
  ProjectTask,
  Show,
  ShowReadinessResponse,
  TimelineEntry,
  WeightEntry
} from "@/lib/api";
import { toUserErrorMessage } from "@/lib/errorMessage";
import { uploadProjectHero, uploadProjectMedia } from "@/lib/uploads";
import { ShowsMediaCard } from "@/components/shows-media-card";

const sections = ["overview", "timeline", "expenses", "shows", "media", "tasks", "checklists"] as const;
type SectionName = (typeof sections)[number];

function formatDate(value?: string | null) {
  if (!value) return "TBD";
  return new Date(value).toLocaleDateString();
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeSection, setActiveSection] = useState<SectionName>("overview");
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
  const [materials, setMaterials] = useState<ProjectMaterial[]>([]);
  const [financialSummary, setFinancialSummary] = useState<ProjectFinancialSummary | null>(null);
  const [checklists, setChecklists] = useState<ChecklistResponse | null>(null);
  const [readiness, setReadiness] = useState<ShowReadinessResponse | null>(null);
  const [reminders, setReminders] = useState<ProjectReminder[]>([]);
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [mediaCaption, setMediaCaption] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const id = Number(params.id);
    const [projectData, profileData, expenseData, showData, timelineData, taskData, mediaData, placingData, authData, weightData, feedData, materialData, financialData, checklistData, readinessData, reminderData] = await Promise.all([
      apiClientJson<Project>(`/projects/${id}`),
      apiClientJson<Profile[]>("/profiles"),
      apiClientJson<Expense[]>(`/expenses?project_id=${id}`).catch(() => []),
      apiClientJson<Show[]>(`/projects/${id}/shows`).catch(() => []),
      apiClientJson<TimelineEntry[]>(`/projects/${id}/timeline`).catch(() => []),
      apiClientJson<ProjectTask[]>(`/projects/${id}/tasks`).catch(() => []),
      apiClientJson<MediaItem[]>(`/media?project_id=${id}`).catch(() => []),
      apiClientJson<Placing[]>(`/projects/${id}/placings`).catch(() => []),
      apiClientJson<AuthStatus>("/auth/status").catch(() => null),
      apiClientJson<WeightEntry[]>(`/projects/${id}/weights`).catch(() => []),
      apiClientJson<FeedEntry[]>(`/projects/${id}/feed`).catch(() => []),
      apiClientJson<ProjectMaterial[]>(`/projects/${id}/materials`).catch(() => []),
      apiClientJson<ProjectFinancialSummary>(`/projects/${id}/financial-summary`).catch(() => null),
      apiClientJson<ChecklistResponse>(`/projects/${id}/checklists`).catch(() => null),
      apiClientJson<ShowReadinessResponse>(`/projects/${id}/show-readiness`).catch(() => null),
      apiClientJson<ProjectReminder[]>(`/projects/${id}/reminders`).catch(() => [])
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
    setMaterials(materialData);
    setFinancialSummary(financialData);
    setChecklists(checklistData);
    setReadiness(readinessData);
    setReminders(reminderData);
  };

  useEffect(() => {
    load().then(() => setError(null)).catch((loadError) => setError(toUserErrorMessage(loadError, "Unable to load project details.")));
  }, [params.id]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && sections.includes(tab as SectionName)) setActiveSection(tab as SectionName);
  }, [searchParams]);

  const ownerName = profiles.find((profile) => profile.id === project?.owner_profile_id)?.name ?? "Unknown owner";
  const totalExpenses = useMemo(() => expenses.reduce((sum, row) => sum + row.amount, 0), [expenses]);
  const latestWeight = weights[0]?.weight_lbs ?? null;

  const addTimeline = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await apiClientJson(`/projects/${params.id}/timeline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: String(form.get("type") || "Update"),
        title: String(form.get("title") || "Project update"),
        description: String(form.get("description") || "") || null,
        date: String(form.get("date") || "")
      })
    });
    event.currentTarget.reset();
    await load();
  };

  const handleHeroUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !project) return;
    try {
      await uploadProjectHero(project.id, file);
      await load();
      setError(null);
    } catch (uploadError) {
      setError(toUserErrorMessage(uploadError, "Unable to upload hero photo."));
    } finally {
      event.target.value = "";
    }
  };

  const handleMediaUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !project) return;
    try {
      await uploadProjectMedia(project.id, file, mediaCaption);
      setMediaCaption("");
      await load();
      setError(null);
    } catch (uploadError) {
      setError(toUserErrorMessage(uploadError, "Unable to upload project media."));
    } finally {
      event.target.value = "";
    }
  };

  if (error && !project) return <p className="px-4 py-4 text-sm text-red-300">{error}</p>;
  if (!project) return <p className="px-4 py-4 text-sm text-[var(--barn-muted)]">Loading project...</p>;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 pb-6">
      <header className="barn-card space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold">{project.name}</h1>
            <p className="text-sm text-[var(--barn-muted)]">{project.project_category ?? project.project_type} • {ownerName}</p>
          </div>
          {auth?.role === "parent" && auth.is_unlocked ? (
            <label className="cursor-pointer rounded bg-[var(--barn-red)] px-3 py-2 text-xs text-white">
              Upload Hero
              <input type="file" accept="image/*" className="hidden" onChange={(event) => handleHeroUpload(event).catch(() => undefined)} />
            </label>
          ) : null}
        </div>
        {error ? <p className="text-xs text-red-200">{error}</p> : null}
        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <p className="barn-row">Status: {project.status}</p>
          <p className="barn-row">Expenses: ${totalExpenses.toFixed(2)}</p>
          <p className="barn-row">Latest Weight: {latestWeight ? `${latestWeight} lbs` : "No entries"}</p>
          <p className="barn-row">Placings: {placings.length}</p>
        </div>
      </header>

      <section className="barn-card flex flex-wrap gap-2 text-xs">
        {sections.map((section) => (
          <button
            key={section}
            type="button"
            onClick={() => setActiveSection(section)}
            className={`rounded px-3 py-2 capitalize ${activeSection === section ? "bg-[var(--barn-red)] text-white" : "bg-[var(--barn-bg)]"}`}
          >
            {section}
          </button>
        ))}
      </section>

      {activeSection === "overview" ? (
        <section className="barn-card space-y-3 text-sm">
          <p>{project.notes || "No notes yet for this project."}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Link href={`/projects/${project.id}/feed`} className="barn-row block">Feed logs ({feedEntries.length})</Link>
            <Link href={`/projects/${project.id}/weights`} className="barn-row block">Weight logs ({weights.length})</Link>
            <Link href={`/projects/${project.id}/tasks`} className="barn-row block">Tasks ({tasks.length})</Link>
            <Link href={`/projects/${project.id}/reminders`} className="barn-row block">Reminders ({reminders.length})</Link>
          </div>
          <p className="text-xs text-[var(--barn-muted)]">Materials tracked: {materials.length} • Net: ${financialSummary?.net_profit_loss?.toFixed(2) ?? "0.00"}</p>
        </section>
      ) : null}

      {activeSection === "timeline" ? (
        <section className="barn-card space-y-3 text-sm">
          <form className="grid gap-2 sm:grid-cols-2" onSubmit={(event) => addTimeline(event).catch(() => undefined)}>
            <input name="date" type="date" className="rounded bg-black/20 p-2" required />
            <input name="type" placeholder="Type" defaultValue="Update" className="rounded bg-black/20 p-2" required />
            <input name="title" placeholder="Title" className="rounded bg-black/20 p-2 sm:col-span-2" required />
            <textarea name="description" placeholder="Description" className="rounded bg-black/20 p-2 sm:col-span-2" />
            <button className="rounded bg-[var(--barn-red)] px-3 py-2 text-sm text-white sm:col-span-2">Save timeline entry</button>
          </form>
          {timeline.length === 0 ? <p className="barn-row text-[var(--barn-muted)]">No timeline entries yet.</p> : timeline.map((item) => <article key={item.id} className="barn-row"><p className="font-medium">{item.title}</p><p className="text-xs text-[var(--barn-muted)]">{formatDate(item.date)} • {item.type}</p></article>)}
        </section>
      ) : null}

      {activeSection === "expenses" ? (
        <section className="barn-card space-y-3 text-sm">
          <div className="flex items-center justify-between"><h2 className="text-base font-semibold">Expenses</h2><Link href={`/expenses/new?projectId=${project.id}`} className="rounded bg-[var(--barn-red)] px-3 py-2 text-xs text-white">Add expense</Link></div>
          {expenses.length === 0 ? <p className="barn-row text-[var(--barn-muted)]">No expenses logged yet.</p> : expenses.map((expense) => <Link key={expense.id} href={`/expenses/${expense.id}`} className="barn-row block"><p className="font-medium">${expense.amount.toFixed(2)} • {expense.vendor ?? expense.category}</p><p className="text-xs text-[var(--barn-muted)]">{formatDate(expense.date)}</p></Link>)}
        </section>
      ) : null}

      {activeSection === "shows" ? (
        <section className="barn-card space-y-3 text-sm">
          <h2 className="text-base font-semibold">Shows</h2>
          {shows.length === 0 ? <p className="barn-row text-[var(--barn-muted)]">No shows for this project yet.</p> : shows.map((show) => <Link key={show.id} href={`/shows/${show.id}`} className="barn-row block"><p className="font-medium">{show.name}</p><p className="text-xs text-[var(--barn-muted)]">{formatDate(show.start_date)} • {show.location}</p></Link>)}
        </section>
      ) : null}

      {activeSection === "media" ? (
        <section className="barn-card space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <input value={mediaCaption} onChange={(event) => setMediaCaption(event.target.value)} placeholder="Caption" className="rounded bg-[var(--barn-bg)] px-3 py-2" />
            <label className="rounded bg-[var(--barn-red)] px-3 py-2 text-xs text-white">Add Media<input type="file" accept="image/*,video/*" className="hidden" onChange={(event) => handleMediaUpload(event).catch(() => undefined)} /></label>
            <Link href={`/projects/${project.id}/gallery`} className="see-all-link">Open gallery</Link>
          </div>
          {media.length === 0 ? <p className="barn-row text-[var(--barn-muted)]">No media uploaded for this project yet.</p> : <div className="grid grid-cols-2 gap-2 md:grid-cols-3">{media.map((item) => <ShowsMediaCard key={item.id} item={item} />)}</div>}
        </section>
      ) : null}

      {activeSection === "tasks" ? (
        <section className="barn-card space-y-3 text-sm">
          <div className="flex items-center justify-between"><h2 className="text-base font-semibold">Tasks / Checklist</h2><Link href={`/projects/${project.id}/tasks`} className="see-all-link">Manage</Link></div>
          {tasks.length === 0 ? <p className="barn-row text-[var(--barn-muted)]">No tasks yet.</p> : tasks.map((task) => <article key={task.id} className="barn-row"><p className={task.is_completed ? "line-through" : ""}>{task.title}</p></article>)}
        </section>
      ) : null}

      {activeSection === "checklists" ? (
        <section className="barn-card space-y-3 text-sm">
          <div className="flex items-center justify-between"><h2 className="text-base font-semibold">Skills / Show readiness</h2><Link href={`/projects/${project.id}/checklists`} className="see-all-link">Checklist</Link></div>
          <p className="text-[var(--barn-muted)]">Checklist: {checklists?.summary.completed ?? 0}/{checklists?.summary.total ?? 0} complete</p>
          <p className="text-[var(--barn-muted)]">Readiness: {readiness?.summary.completed ?? 0}/{readiness?.summary.total ?? 0} ready</p>
          <Link href={`/projects/${project.id}/show-readiness`} className="barn-row block">Open show readiness board</Link>
        </section>
      ) : null}

      {auth?.role === "parent" && auth.is_unlocked ? (
        <section className="barn-card space-y-2 text-sm">
          <h2 className="text-base font-semibold">Project actions</h2>
          <div className="flex flex-wrap gap-2">
            <Link href={`/projects/${project.id}/edit`} className="rounded bg-neutral-700 px-3 py-2 text-xs">Edit Project</Link>
            <button onClick={() => apiClientJson(`/projects/${project.id}`, { method: "DELETE" }).then(() => router.push("/projects"))} className="rounded bg-red-900 px-3 py-2 text-xs">Delete Project</button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
