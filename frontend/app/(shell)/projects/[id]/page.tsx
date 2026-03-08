"use client";

import {
  BarChart3,
  ClipboardList,
  DollarSign,
  HeartPulse,
  ImageIcon,
  Scale,
  Target,
  TrendingUp,
  Trophy,
  Utensils
} from "lucide-react";
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
import { cn } from "@/lib/utils";

type SectionName = "info" | "tasks" | "expenses" | "weight";

function formatDate(value?: string | null) {
  if (!value) return "TBD";
  return new Date(value).toLocaleDateString();
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeSection, setActiveSection] = useState<SectionName>("info");
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
    if (tab === "tasks" || tab === "expenses" || tab === "weight" || tab === "info") {
      setActiveSection(tab);
    }
  }, [searchParams]);

  const ownerName = profiles.find((profileItem) => profileItem.id === project?.owner_profile_id)?.name ?? "Unknown owner";
  const totalExpenses = useMemo(() => expenses.reduce((sum, row) => sum + row.amount, 0), [expenses]);
  const latestWeight = weights[0]?.weight_lbs ?? null;
  const targetWeight = project?.target_weight ?? null;
  const weightProgress = targetWeight && latestWeight ? Math.min(100, Math.round((latestWeight / targetWeight) * 100)) : 0;

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

  if (error && !project) return <p className="px-4 py-4 text-sm text-destructive">{error}</p>;
  if (!project) return <p className="px-4 py-4 text-sm text-muted-foreground">Loading project...</p>;

  const moduleTiles = [
    { href: `/projects/${project.id}/feed`, label: "Feed", icon: Utensils, badge: `${feedEntries.length}` },
    { href: `/projects/${project.id}/health`, label: "Health", icon: HeartPulse },
    { href: `/projects/${project.id}/weights`, label: "Weight", icon: Scale, badge: latestWeight ? `${latestWeight} lb` : undefined },
    { href: `/projects/${project.id}/expenses`, label: "Expenses", icon: DollarSign, badge: `$${totalExpenses.toFixed(0)}` },
    { href: `/reports/projects/${project.id}`, label: "Financials", icon: TrendingUp },
    { href: `/projects/${project.id}/gallery`, label: "Gallery", icon: ImageIcon, badge: `${media.length}` },
    { href: `/projects/${project.id}/show-readiness`, label: "Goals", icon: Target },
    { href: `/projects/${project.id}/timeline`, label: "Timeline", icon: ClipboardList, badge: `${timeline.length}` },
    { href: `/reports/projects/${project.id}`, label: "Reports", icon: BarChart3 },
    { href: `/projects/${project.id}/shows`, label: "Shows", icon: Trophy, badge: `${shows.length}` }
  ];

  return (
    <div className="-mx-4 pb-8">
      <section className="relative h-56 w-full overflow-hidden">
        {project.photo_url ? (
          <img src={project.photo_url} alt={project.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary text-6xl">{project.is_livestock ? "🐄" : "📋"}</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <Link href="/projects" className="absolute left-4 top-4 rounded-full bg-white/20 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
          Back
        </Link>
        {auth?.role === "parent" && auth.is_unlocked ? (
          <label className="absolute right-4 top-4 cursor-pointer rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
            Upload
            <input type="file" accept="image/*" className="hidden" onChange={(event) => handleHeroUpload(event).catch(() => undefined)} />
          </label>
        ) : null}
        <div className="absolute bottom-4 left-4 right-4">
          <p className="text-xs uppercase tracking-wider text-white/80">{project.project_category ?? project.project_type}</p>
          <h1 className="font-serif text-3xl text-white">{project.name}</h1>
          <p className="text-sm text-white/80">{ownerName}</p>
        </div>
      </section>

      <div className="space-y-5 px-4 pt-4">
        {error ? <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p> : null}

        <div className="grid grid-cols-4 gap-2">
          <div className="rounded-xl border border-border bg-card p-2 text-center"><p className="font-serif text-lg">{placings.length}</p><p className="text-[9px] uppercase tracking-wider text-muted-foreground">Ribbons</p></div>
          <div className="rounded-xl border border-border bg-card p-2 text-center"><p className="font-mono text-sm">${totalExpenses.toFixed(0)}</p><p className="text-[9px] uppercase tracking-wider text-muted-foreground">Spent</p></div>
          <div className="rounded-xl border border-border bg-card p-2 text-center"><p className="font-serif text-lg">{tasks.filter((task) => !task.is_completed).length}</p><p className="text-[9px] uppercase tracking-wider text-muted-foreground">Tasks</p></div>
          <div className="rounded-xl border border-border bg-card p-2 text-center"><p className="font-mono text-sm">${(financialSummary?.net_profit_loss ?? 0).toFixed(0)}</p><p className="text-[9px] uppercase tracking-wider text-muted-foreground">Net P/L</p></div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {moduleTiles.slice(0, 8).map((tile) => (
            <Link key={tile.href + tile.label} href={tile.href} className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-4 transition-all hover:shadow-md active:scale-[0.98]">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                <tile.icon className="h-5 w-5 text-secondary-foreground" />
              </div>
              <span className="text-xs font-medium text-foreground">{tile.label}</span>
              {tile.badge ? <span className="font-mono text-[10px] text-muted-foreground">{tile.badge}</span> : null}
            </Link>
          ))}
        </div>

        <section className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-serif text-lg">Weight Projection</h2>
            <span className="font-mono text-xs text-muted-foreground">{latestWeight ? `${latestWeight} / ${targetWeight ?? "--"} lb` : "No data"}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${weightProgress}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Goal progress: {weightProgress}%</p>
        </section>

        <div className="grid grid-cols-4 gap-2 rounded-xl border border-border bg-card p-1">
          {(["info", "tasks", "expenses", "weight"] as SectionName[]).map((tab) => (
            <button key={tab} type="button" onClick={() => setActiveSection(tab)} className={cn("rounded-lg px-2 py-2 text-xs font-medium capitalize", activeSection === tab ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{tab}</button>
          ))}
        </div>

        {activeSection === "info" ? (
          <section className="rounded-xl border border-border bg-card">
            {[`Status: ${project.status}`, `Owner: ${ownerName}`, `Materials tracked: ${materials.length}`, `Reminders: ${reminders.length}`, `Checklist complete: ${checklists?.summary.completed ?? 0}/${checklists?.summary.total ?? 0}`, `Readiness: ${readiness?.summary.completed ?? 0}/${readiness?.summary.total ?? 0}`].map((line, i, arr) => (
              <div key={line}>
                <div className="px-4 py-3 text-sm">{line}</div>
                {i < arr.length - 1 ? <div className="mx-4 h-px bg-border" /> : null}
              </div>
            ))}
          </section>
        ) : null}

        {activeSection === "tasks" ? (
          <section className="rounded-xl border border-border bg-card">
            {tasks.length === 0 ? <p className="px-4 py-3 text-sm text-muted-foreground">No tasks yet.</p> : tasks.map((task, i) => (
              <div key={task.id}>
                <div className="px-4 py-3 text-sm"><p className={task.is_completed ? "line-through text-muted-foreground" : ""}>{task.title}</p></div>
                {i < tasks.length - 1 ? <div className="mx-4 h-px bg-border" /> : null}
              </div>
            ))}
          </section>
        ) : null}

        {activeSection === "expenses" ? (
          <section className="rounded-xl border border-border bg-card">
            {expenses.length === 0 ? <p className="px-4 py-3 text-sm text-muted-foreground">No expenses logged yet.</p> : expenses.map((expense, i) => (
              <div key={expense.id}>
                <div className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium">{expense.vendor ?? expense.category}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(expense.date)}</p>
                  </div>
                  <span className="font-mono">${expense.amount.toFixed(2)}</span>
                </div>
                {i < expenses.length - 1 ? <div className="mx-4 h-px bg-border" /> : null}
              </div>
            ))}
          </section>
        ) : null}

        {activeSection === "weight" ? (
          <section className="rounded-xl border border-border bg-card">
            {weights.length === 0 ? <p className="px-4 py-3 text-sm text-muted-foreground">No weight entries yet.</p> : weights.map((entry, i) => (
              <div key={entry.id}>
                <div className="flex items-center justify-between px-4 py-3 text-sm">
                  <span>{formatDate(entry.recorded_at)}</span>
                  <span className="font-mono">{entry.weight_lbs.toFixed(1)} lb</span>
                </div>
                {i < weights.length - 1 ? <div className="mx-4 h-px bg-border" /> : null}
              </div>
            ))}
          </section>
        ) : null}

        <section className="rounded-xl border border-border bg-card p-3">
          <form className="grid gap-2" onSubmit={(event) => addTimeline(event).catch(() => undefined)}>
            <input name="date" type="date" className="rounded-lg border border-input bg-background px-3 py-2 text-sm" required />
            <input name="type" placeholder="Type" defaultValue="Update" className="rounded-lg border border-input bg-background px-3 py-2 text-sm" required />
            <input name="title" placeholder="Title" className="rounded-lg border border-input bg-background px-3 py-2 text-sm" required />
            <textarea name="description" placeholder="Description" className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            <button className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">Save timeline entry</button>
          </form>
        </section>

        <section className="rounded-xl border border-border bg-card p-3">
          <div className="mb-2 flex items-center gap-2">
            <input value={mediaCaption} onChange={(event) => setMediaCaption(event.target.value)} placeholder="Caption" className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            <label className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground">
              Add Media
              <input type="file" accept="image/*,video/*" className="hidden" onChange={(event) => handleMediaUpload(event).catch(() => undefined)} />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">Media items: {media.length}</p>
        </section>

        {auth?.role === "parent" && auth.is_unlocked ? (
          <section className="rounded-xl border border-border bg-card p-3">
            <h2 className="mb-2 font-serif text-lg">Project actions</h2>
            <div className="flex flex-wrap gap-2">
              <Link href={`/projects/${project.id}/edit`} className="rounded-lg border border-border bg-secondary px-3 py-2 text-xs">Edit Project</Link>
              <button onClick={() => apiClientJson(`/projects/${project.id}`, { method: "DELETE" }).then(() => router.push("/projects"))} className="rounded-lg bg-destructive px-3 py-2 text-xs text-white">Delete Project</button>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
