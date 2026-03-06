"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

import { apiClientJson, AuthStatus, ChecklistResponse, Expense, FamilyInventoryItem, FeedEntry, MediaItem, Placing, Profile, Project, ProjectFinancialSummary, ProjectMaterial, ProjectReminder, ProjectTask, Show, ShowReadinessResponse, TimelineEntry, WeightEntry } from "@/lib/api";
import { uploadProjectHero, uploadProjectMedia } from "@/lib/uploads";
import { ShowsMediaCard } from "@/components/shows-media-card";

const sections = ["overview", "materials", "financial", "feed", "timeline", "reminders", "expenses", "shows", "media", "tasks", "checklists", "readiness"] as const;

type SectionName = (typeof sections)[number];

function formatDate(value?: string | null) {
  if (!value) return "No date";
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
  const [inventory, setInventory] = useState<FamilyInventoryItem[]>([]);
  const [financialSummary, setFinancialSummary] = useState<ProjectFinancialSummary | null>(null);
  const [checklists, setChecklists] = useState<ChecklistResponse | null>(null);
  const [readiness, setReadiness] = useState<ShowReadinessResponse | null>(null);
  const [reminders, setReminders] = useState<ProjectReminder[]>([]);
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [mediaCaption, setMediaCaption] = useState("");

  const load = async () => {
    const id = Number(params.id);
    const [projectData, profileData, expenseData, showData, timelineData, taskData, mediaData, placingData, authData, weightData, feedData, materialData, inventoryData, financialData, checklistData, readinessData, reminderData] = await Promise.all([
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
      apiClientJson<ProjectMaterial[]>(`/projects/${id}/materials`).catch(() => []),
      apiClientJson<FamilyInventoryItem[]>("/inventory").catch(() => []),
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
    setInventory(inventoryData);
    setFinancialSummary(financialData);
    setChecklists(checklistData);
    setReadiness(readinessData);
    setReminders(reminderData);
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [params.id]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && sections.includes(tab as SectionName)) setActiveSection(tab as SectionName);
  }, [searchParams]);

  const ownerName = profiles.find((profile) => profile.id === project?.owner_profile_id)?.name ?? "Unknown owner";
  const totalExpenses = useMemo(() => expenses.reduce((sum, row) => sum + row.amount, 0), [expenses]);
  const latestWeight = weights[0]?.weight_lbs ?? null;

  if (!project) return <p className="px-4">Loading project...</p>;

  const addMaterial = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    await apiClientJson(`/projects/${project.id}/materials`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    event.currentTarget.reset();
    await load();
  };

  const addTimeline = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await apiClientJson(`/projects/${params.id}/timeline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: String(form.get("type") || "Other"), title: String(form.get("title") || "Update"), description: String(form.get("note") || "").trim() || null, date: form.get("date") })
    });
    event.currentTarget.reset();
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

  return (
    <div className="w-full space-y-3 px-4 pb-4">
      <section className="barn-card space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{project.name}</h1>
            <p className="text-sm capitalize text-[var(--barn-muted)]">{project.project_category || project.project_type} • {ownerName}</p>
            <p className="text-xs text-[var(--barn-muted)]">Status {project.status}</p>
          </div>
          {project.photo_url ? <img src={project.photo_url} alt={project.name} className="h-16 w-16 rounded-lg object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[var(--barn-surface)] text-xs">No photo</div>}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {project.is_livestock ? (
            <>
              <article className="rounded-lg border border-[var(--barn-border)] bg-[var(--barn-bg)] p-2">Breed<br /><span className="text-sm font-semibold">{project.breed || "—"}</span></article>
              <article className="rounded-lg border border-[var(--barn-border)] bg-[var(--barn-bg)] p-2">Current weight<br /><span className="text-sm font-semibold">{latestWeight ? `${latestWeight} lbs` : "Not set"}</span></article>
            </>
          ) : (
            <>
              <article className="rounded-lg border border-[var(--barn-border)] bg-[var(--barn-bg)] p-2">Goal<br /><span className="text-sm font-semibold">{project.goal || "Add a goal"}</span></article>
              <article className="rounded-lg border border-[var(--barn-border)] bg-[var(--barn-bg)] p-2">Target completion<br /><span className="text-sm font-semibold">{formatDate(project.completion_target_date)}</span></article>
            </>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs sm:grid-cols-5">
          {sections.map((section) => (
            <button key={section} type="button" onClick={() => setActiveSection(section)} className={`rounded-lg px-2 py-2 text-xs font-medium capitalize ${activeSection === section ? "bg-[var(--barn-red)] text-white" : "bg-black/20 text-[var(--barn-muted)]"}`}>
              {section}
            </button>
          ))}
        </div>
      </section>

      {activeSection === "overview" ? (
        <section className="barn-card space-y-2 text-sm">
          <h2 className="text-base font-semibold">Project Overview</h2>
          {project.is_livestock ? (
            <p className="text-[var(--barn-muted)]">Ear tag: {project.ear_tag || "—"} • Sex: {project.sex || "—"} • Purchase date: {formatDate(project.purchase_date)}</p>
          ) : (
            <p className="text-[var(--barn-muted)]">Category: {project.project_category || "—"} • Competition: {project.competition_category || "—"}</p>
          )}
          <p className="text-[var(--barn-muted)]">{project.notes || "No notes yet."}</p>
        </section>
      ) : null}

      {activeSection === "materials" ? (
        <section className="barn-card space-y-3 text-sm">
          <h2 className="text-base font-semibold">Materials & Supplies</h2>
          <form onSubmit={(event) => addMaterial(event).catch(() => undefined)} className="grid gap-2 rounded-lg bg-[var(--barn-bg)] p-3">
            <input name="item_name" placeholder="Item name" required className="rounded bg-black/20 p-2" />
            <div className="grid gap-2 sm:grid-cols-2">
              <input name="quantity" type="number" step="0.1" placeholder="Quantity" className="rounded bg-black/20 p-2" />
              <input name="unit" placeholder="Unit" className="rounded bg-black/20 p-2" />
              <input name="status" placeholder="Status (needed, purchased, assigned)" className="rounded bg-black/20 p-2" />
              <select name="inventory_item_id" className="rounded bg-black/20 p-2"><option value="">Link inventory item (optional)</option>{inventory.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            </div>
            <textarea name="notes" placeholder="Notes" className="rounded bg-black/20 p-2" />
            <button className="rounded bg-[var(--barn-red)] px-3 py-2 text-xs">Add material</button>
          </form>
          {materials.length === 0 ? <p className="barn-row text-[var(--barn-muted)]">No materials yet.</p> : materials.map((item) => <article key={item.id} className="barn-row"><p className="font-medium">{item.item_name}</p><p className="text-xs text-[var(--barn-muted)]">{item.quantity ?? ""} {item.unit ?? ""} • {item.status ?? "Status n/a"}</p><p className="text-xs text-[var(--barn-muted)]">{item.notes ?? "No notes"}</p></article>)}
        </section>
      ) : null}

      {activeSection === "financial" ? (
        <section className="barn-card space-y-2 text-sm">
          <h2 className="text-base font-semibold">Financial</h2>
          <p className="text-[var(--barn-muted)]">Expenses ${totalExpenses.toFixed(2)} • Feed ${feedEntries.reduce((sum, row) => sum + (row.cost ?? 0), 0).toFixed(2)}</p>
          {financialSummary ? <p className="text-[var(--barn-muted)]">Net ${financialSummary.net_profit_loss.toFixed(2)} • Income ${financialSummary.total_income.toFixed(2)}</p> : null}
        </section>
      ) : null}

      {activeSection === "feed" ? <section className="barn-card space-y-2 text-sm"><h2 className="text-base font-semibold">Feed</h2>{feedEntries.length === 0 ? <p className="barn-row text-[var(--barn-muted)]">No feed entries yet.</p> : feedEntries.map((row) => <p key={row.id} className="barn-row">{formatDate(row.recorded_at)} • {row.feed_type} • {row.amount} {row.unit}</p>)}</section> : null}

      {activeSection === "reminders" ? <section className="barn-card space-y-3 text-sm"><div className="flex items-center justify-between"><h2 className="text-base font-semibold">Reminders</h2><Link href={`/projects/${project.id}/reminders`} className="rounded bg-[var(--barn-red)] px-3 py-2 text-xs">Open reminders</Link></div>{reminders.length === 0 ? <p className="barn-row text-[var(--barn-muted)]">No reminders configured.</p> : reminders.map((item) => <article key={item.id} className="barn-row"><p className="font-medium">{item.type.replace("_", " ")}{item.parent_locked ? " 🔒" : ""}</p><p className="text-xs text-[var(--barn-muted)]">{item.enabled ? "Enabled" : "Disabled"} • {item.time_of_day || "Any time"} • {item.frequency || "No frequency"}</p></article>)}</section> : null}

      {activeSection === "timeline" ? <section className="barn-card space-y-3 text-sm"><h2 className="text-base font-semibold">Timeline</h2><form className="grid gap-2 rounded-lg bg-[var(--barn-bg)] p-3" onSubmit={(event) => addTimeline(event).catch(() => undefined)}><input name="date" type="date" className="rounded bg-black/20 p-2" required /><input name="title" placeholder="Title" className="rounded bg-black/20 p-2" /><input name="type" placeholder="Type" className="rounded bg-black/20 p-2" defaultValue="Other" /><textarea name="note" placeholder="Note" className="rounded bg-black/20 p-2" /><button className="rounded bg-[var(--barn-red)] px-3 py-2 text-sm">Save entry</button></form><label className="inline-flex rounded bg-neutral-700 px-3 py-2 text-xs">Upload media to timeline<input type="file" accept="image/*,video/mp4,video/quicktime,video/mov" className="hidden" onChange={(event) => handleMediaUpload(event).catch(() => undefined)} /></label>{timeline.length === 0 ? <p className="barn-row text-[var(--barn-muted)]">No timeline entries yet.</p> : timeline.map((item) => <article key={item.id} className="barn-row"><p className="font-medium">{item.title}</p><p className="text-xs text-[var(--barn-muted)]">{formatDate(item.date)} • {item.type}</p></article>)}</section> : null}

      {activeSection === "expenses" ? <section className="barn-card space-y-3 text-sm"><div className="flex items-center justify-between"><h2 className="text-base font-semibold">Expenses</h2><Link href={`/expenses/new?projectId=${project.id}`} className="rounded bg-[var(--barn-red)] px-3 py-2 text-xs">Add expense</Link></div>{expenses.length === 0 ? <p className="barn-row text-[var(--barn-muted)]">No expenses logged yet.</p> : expenses.map((expense) => <Link key={expense.id} href={`/expenses/${expense.id}`} className="barn-row block"><p className="font-medium">${expense.amount.toFixed(2)} • {expense.vendor ?? expense.category}</p><p className="text-xs text-[var(--barn-muted)]">{formatDate(expense.date)}</p></Link>)}</section> : null}

      {activeSection === "shows" ? <section className="barn-card space-y-3 text-sm"><h2 className="text-base font-semibold">Shows / Entries</h2>{shows.length === 0 ? <p className="barn-row text-[var(--barn-muted)]">No shows for this project yet.</p> : shows.map((show) => <Link key={show.id} href={`/shows/${show.id}`} className="barn-row block"><p className="font-medium">{show.name}</p><p className="text-xs text-[var(--barn-muted)]">{formatDate(show.start_date)} • {show.location}</p></Link>)}{placings.length > 0 ? <p className="text-xs text-[var(--barn-muted)]">Placings recorded: {placings.length}</p> : null}</section> : null}

      {activeSection === "media" ? <section className="barn-card space-y-3 text-sm"><div className="flex items-center justify-between"><h2 className="text-base font-semibold">Media</h2><Link href={`/projects/${project.id}/gallery`} className="see-all-link">Open gallery</Link></div><div className="flex flex-wrap items-center gap-2"><input value={mediaCaption} onChange={(event) => setMediaCaption(event.target.value)} placeholder="Caption" className="rounded bg-[var(--barn-bg)] px-3 py-2" /><label className="rounded bg-[var(--barn-red)] px-3 py-2 text-xs">Add Media<input type="file" accept="image/*,video/*" className="hidden" onChange={(event) => handleMediaUpload(event).catch(() => undefined)} /></label></div>{media.length === 0 ? <p className="barn-row text-[var(--barn-muted)]">No media uploaded for this project yet.</p> : <div className="grid grid-cols-2 gap-2 md:grid-cols-3">{media.map((item) => <ShowsMediaCard key={item.id} item={item} />)}</div>}</section> : null}

      {activeSection === "tasks" ? <section className="barn-card space-y-3 text-sm"><h2 className="text-base font-semibold">Tasks</h2>{tasks.length === 0 ? <p className="barn-row text-[var(--barn-muted)]">No tasks yet.</p> : tasks.map((task) => <article key={task.id} className="barn-row"><p className={task.is_completed ? "line-through" : ""}>{task.title}</p></article>)}</section> : null}

      {activeSection === "checklists" ? <section className="barn-card space-y-3 text-sm"><div className="flex items-center justify-between"><h2 className="text-base font-semibold">Checklist / Skills</h2><Link href={`/projects/${project.id}/checklists`} className="rounded bg-neutral-700 px-2 py-1 text-xs">Open</Link></div><p className="text-[var(--barn-muted)]">Completed {checklists?.summary.completed ?? 0} of {checklists?.summary.total ?? 0} ({checklists?.summary.completion_percent ?? 0}%)</p><div className="h-2 w-full overflow-hidden rounded bg-neutral-800"><div className="h-full bg-green-600" style={{ width: `${checklists?.summary.completion_percent ?? 0}%` }} /></div></section> : null}

      {activeSection === "readiness" ? <section className="barn-card space-y-3 text-sm"><div className="flex items-center justify-between"><h2 className="text-base font-semibold">Show readiness</h2><Link href={`/projects/${project.id}/show-readiness`} className="rounded bg-neutral-700 px-2 py-1 text-xs">Open</Link></div><p className="text-[var(--barn-muted)]">Ready items {readiness?.summary.completed ?? 0} of {readiness?.summary.total ?? 0} ({readiness?.summary.completion_percent ?? 0}%)</p><div className="h-2 w-full overflow-hidden rounded bg-neutral-800"><div className="h-full bg-amber-500" style={{ width: `${readiness?.summary.completion_percent ?? 0}%` }} /></div></section> : null}

      {auth?.role === "parent" && auth.is_unlocked ? (
        <section className="barn-card space-y-2 text-sm">
          <h2 className="text-base font-semibold">Project actions</h2>
          <div className="flex flex-wrap gap-2">
            <Link href={`/projects/${project.id}/edit`} className="rounded bg-neutral-700 px-3 py-2 text-xs">Edit Project</Link>
            <label className="rounded bg-neutral-700 px-3 py-2 text-xs">Upload Hero<input type="file" accept="image/*" className="hidden" onChange={(event) => handleHeroUpload(event).catch(() => undefined)} /></label>
            <button onClick={() => apiClientJson(`/projects/${project.id}`, { method: "DELETE" }).then(() => router.push("/projects"))} className="rounded bg-red-900 px-3 py-2 text-xs">Delete Project</button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
