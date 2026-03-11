"use client";

import {
  BarChart3,
  Camera,
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
import { format } from "date-fns";
import { useParams, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Drawer } from "vaul";

import {
  apiClientJson,
  AuthStatus,
  ChecklistResponse,
  Expense,
  FeedEntry,
  FeedInventoryItem,
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
import LogActivityDrawer from "@/components/LogActivityDrawer";
import WeightChart from "@/components/WeightChart";

type SectionName = "info" | "tasks" | "expenses" | "weight" | "feed";

interface ProjectFeedLog {
  id: number;
  feed_name: string;
  amount_lbs: number;
  notes: string | null;
  logged_at: string;
}

function formatDate(value?: string | null) {
  if (!value) return "TBD";
  return new Date(value).toLocaleDateString();
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
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
  const [feedLogs, setFeedLogs] = useState<ProjectFeedLog[]>([]);
  const [feedLogDrawerOpen, setFeedLogDrawerOpen] = useState(false);
  const [feedInventory, setFeedInventory] = useState<FeedInventoryItem[]>([]);
  const [materials, setMaterials] = useState<ProjectMaterial[]>([]);
  const [financialSummary, setFinancialSummary] = useState<ProjectFinancialSummary | null>(null);
  const [checklists, setChecklists] = useState<ChecklistResponse | null>(null);
  const [readiness, setReadiness] = useState<ShowReadinessResponse | null>(null);
  const [reminders, setReminders] = useState<ProjectReminder[]>([]);
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [mediaCaption, setMediaCaption] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const id = Number(params.id);
    const [projectData, profileData, expenseData, showData, timelineData, taskData, mediaData, placingData, authData, weightData, feedData, feedLogsData, materialData, financialData, checklistData, readinessData, reminderData, feedInventoryData] = await Promise.all([
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
      apiClientJson<ProjectFeedLog[]>(`/projects/${id}/feed-logs`).catch(() => []),
      apiClientJson<ProjectMaterial[]>(`/projects/${id}/materials`).catch(() => []),
      apiClientJson<ProjectFinancialSummary>(`/projects/${id}/financial-summary`).catch(() => null),
      apiClientJson<ChecklistResponse>(`/projects/${id}/checklists`).catch(() => null),
      apiClientJson<ShowReadinessResponse>(`/projects/${id}/show-readiness`).catch(() => null),
      apiClientJson<ProjectReminder[]>(`/projects/${id}/reminders`).catch(() => []),
      apiClientJson<FeedInventoryItem[]>("/feed-inventory").catch(() => [])
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
    setFeedLogs(feedLogsData);
    setMaterials(materialData);
    setFinancialSummary(financialData);
    setChecklists(checklistData);
    setReadiness(readinessData);
    setReminders(reminderData);
    setFeedInventory(feedInventoryData);
  };

  useEffect(() => {
    load().then(() => setError(null)).catch((loadError) => setError(toUserErrorMessage(loadError, "Unable to load project details.")));
  }, [params.id]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "tasks" || tab === "expenses" || tab === "weight" || tab === "info" || tab === "feed") {
      setActiveSection(tab);
    }
  }, [searchParams]);

  const ownerName = profiles.find((profileItem) => profileItem.id === project?.owner_profile_id)?.name ?? "Unknown owner";
  const totalExpenses = useMemo(() => expenses.reduce((sum, row) => sum + row.amount, 0), [expenses]);
  const latestWeight = weights[0]?.weight_lbs ?? null;
  const targetWeight = project?.target_weight ?? null;
  const projectTargetWeightLbs = (project as (Project & { target_weight_lbs?: number | null }) | null)?.target_weight_lbs;
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



  const createFeedLog = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    try {
      const feedInventoryId = Number(form.get("feed_inventory_id") || 0);
      const amountLbs = Number(form.get("amount_lbs") || 0);
      const notes = String(form.get("notes") || "").trim();

      const created = await apiClientJson<{ id: number }>(`/projects/${params.id}/feed-logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feed_inventory_id: feedInventoryId,
          amount_lbs: amountLbs,
          notes
        })
      });

      const selectedFeed = feedInventory.find((item) => item.id === feedInventoryId);
      const nextLog: ProjectFeedLog = {
        id: created.id,
        feed_name: selectedFeed?.name ?? "Feed",
        amount_lbs: amountLbs,
        notes,
        logged_at: new Date().toISOString()
      };

      setFeedLogDrawerOpen(false);
      event.currentTarget.reset();
      setFeedLogs((prev) => [nextLog, ...prev]);
      toast.success("Feed logged");
    } catch {
      toast.error("Failed to log feed");
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
    { href: `/projects/${project.id}/feed`, label: "Feed", icon: Utensils, badge: `${feedLogs.length}` },
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
    <div className="pb-8">
      <section className="-mx-4 h-48 overflow-hidden">
        {project.photo_url ? (
          <img src={project.photo_url} alt={project.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary text-6xl">{project.is_livestock ? "🐄" : "📋"}</div>
        )}
      </section>

      <div className="mt-3">
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-2 text-sm text-foreground">
          <Camera size={16} />
          <span>Update photo</span>
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => handleHeroUpload(event).catch(() => undefined)} />
        </label>
      </div>

      <div className="mt-3">
        <h1 className="font-serif text-2xl text-foreground">{project.name}</h1>
        <p className="text-sm capitalize text-muted-foreground">
          {project.species} • {ownerName}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        <div className="flex flex-col items-center rounded-xl border border-border bg-card px-1 py-2.5">
          <p className="text-sm font-semibold text-foreground">{latestWeight ? `${latestWeight} lbs` : "—"}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">Weight</p>
        </div>
        <div className="flex flex-col items-center rounded-xl border border-border bg-card px-1 py-2.5">
          <p className="text-sm font-semibold text-foreground">{targetWeight ? `${targetWeight} lbs` : "—"}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">Target</p>
        </div>
        <div className="flex flex-col items-center rounded-xl border border-border bg-card px-1 py-2.5">
          <p className="text-sm font-semibold text-foreground">{tasks.filter((task) => !task.is_completed).length}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">Tasks</p>
        </div>
        <div className="flex flex-col items-center rounded-xl border border-border bg-card px-1 py-2.5">
          <p className="text-sm font-semibold text-foreground">{financialSummary ? `$${financialSummary.total_expenses.toFixed(0)}` : "—"}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">Spent</p>
        </div>
      </div>

      <div className="mt-4 -mx-4 flex gap-0 border-b border-border px-4">
        {(["info", "tasks", "expenses", "feed", "weight"] as SectionName[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveSection(tab)}
            className={cn(
              "relative flex-1 pb-2 text-center text-sm font-medium",
              activeSection === tab
                ? "text-primary after:absolute after:bottom-0 after:inset-x-0 after:h-0.5 after:rounded-full after:bg-primary"
                : "text-muted-foreground"
            )}
          >
            {tab === "info" ? "Info" : tab === "tasks" ? "Tasks" : tab === "expenses" ? "Expenses" : tab === "feed" ? "Feed" : "Weight"}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {error ? <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p> : null}

        {activeSection === "info" ? (
          <section className="rounded-xl border border-border bg-card px-4 pb-4">
            {[
              { label: "Status", value: project.status },
              { label: "Owner", value: ownerName },
              { label: "Materials", value: String(materials.length) },
              { label: "Reminders", value: String(reminders.length) },
              { label: "Checklist", value: `${checklists?.summary.completed ?? 0}/${checklists?.summary.total ?? 0}` },
              { label: "Readiness", value: `${readiness?.summary.completed ?? 0}/${readiness?.summary.total ?? 0}` }
            ].map((item, index, arr) => (
              <div key={item.label} className={cn("flex justify-between py-2", index < arr.length - 1 ? "border-b border-border" : "") }>
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className="text-right text-sm font-medium text-foreground">{item.value}</span>
              </div>
            ))}
            <a
              href={`/api/export/project/${params.id}.pdf`}
              download
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground"
            >
              <span>📄</span>
              Download Record Book PDF
            </a>
          </section>
        ) : null}

        {activeSection === "tasks" ? (
          <section className="rounded-xl border border-border bg-card px-4">
            {tasks.length === 0 ? (
              <p className="py-3 text-sm text-muted-foreground">No tasks yet.</p>
            ) : (
              tasks.map((task, i) => (
                <div key={task.id} className={cn("flex items-center gap-3 py-2", i < tasks.length - 1 ? "border-b border-border" : "") }>
                  <div className={cn("h-5 w-5 rounded-full border-2", task.is_completed ? "border-primary bg-primary" : "border-border")} />
                  <p className={cn("text-sm text-foreground", task.is_completed ? "line-through text-muted-foreground" : "")}>{task.title}</p>
                  <span className="ml-auto text-xs text-muted-foreground">{task.due_date ? formatDate(task.due_date) : "No due date"}</span>
                </div>
              ))
            )}
          </section>
        ) : null}

        {activeSection === "expenses" ? (
          <section className="rounded-xl border border-border bg-card px-4">
            {expenses.length === 0 ? (
              <p className="py-3 text-sm text-muted-foreground">No expenses logged yet.</p>
            ) : (
              expenses.map((expense, i) => (
                <div key={expense.id} className={cn("flex items-center justify-between py-2", i < expenses.length - 1 ? "border-b border-border" : "") }>
                  <div>
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{expense.category}</span>
                    <span className="ml-2 text-sm text-foreground">{expense.vendor ?? "Unknown vendor"}</span>
                  </div>
                  <span className="text-sm font-semibold">${expense.amount.toFixed(2)}</span>
                </div>
              ))
            )}
          </section>
        ) : null}


        {activeSection === "feed" ? (
          <section className="rounded-xl border border-border bg-card px-4 py-3">
            {feedLogs.length === 0 ? (
              <p className="py-3 text-sm text-muted-foreground">No feed logs yet.</p>
            ) : (
              <div className="space-y-2">
                {feedLogs.map((log) => (
                  <div key={log.id} className="rounded-2xl border border-border bg-card px-4 py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">{log.feed_name}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(log.logged_at), "MMM d, h:mm a")}</p>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {log.amount_lbs} lbs {log.notes ? `· ${log.notes}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setFeedLogDrawerOpen(true)}
              className="mt-4 w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm text-foreground"
            >
              + Log Feed
            </button>
          </section>
        ) : null}

        {activeSection === "weight" ? (
          <section className="rounded-xl border border-border bg-card px-4">
            <WeightChart
              entries={weights.map((entry) => ({ recorded_at: entry.recorded_at, weight_lbs: entry.weight_lbs }))}
              targetWeight={projectTargetWeightLbs ?? undefined}
            />
            {weights.length === 0 ? (
              <p className="py-3 text-sm text-muted-foreground">No weight entries yet.</p>
            ) : (
              weights.map((entry, i) => (
                <div key={entry.id} className={cn("flex items-center justify-between py-2", i < weights.length - 1 ? "border-b border-border" : "") }>
                  <span className="text-sm text-muted-foreground">{formatDate(entry.recorded_at)}</span>
                  <span className="text-sm font-semibold">{entry.weight_lbs.toFixed(1)} lbs</span>
                </div>
              ))
            )}
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
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-serif text-lg">Project actions</h2>
              <label className="cursor-pointer rounded-lg border border-border bg-secondary px-3 py-2 text-xs">
                Upload Hero
                <input type="file" accept="image/*" className="hidden" onChange={(event) => handleHeroUpload(event).catch(() => undefined)} />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/projects/${project.id}/edit`} className="rounded-lg border border-border bg-secondary px-3 py-2 text-xs">Edit Project</Link>
              <button onClick={() => apiClientJson(`/projects/${project.id}`, { method: "DELETE" }).then(() => window.location.href = '/projects')} className="rounded-lg bg-destructive px-3 py-2 text-xs text-primary-foreground">Delete Project</button>
            </div>
          </section>
        ) : null}
      </div>

      <button
        onClick={() => setDrawerOpen(true)}
        className="fixed bottom-20 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-transform active:scale-95"
      >
        <span className="text-base">+</span>
        Log Activity
      </button>

      <Drawer.Root open={feedLogDrawerOpen} onOpenChange={setFeedLogDrawerOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-card p-6 pb-10 shadow-xl">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border" />
            <h2 className="mb-4 font-serif text-xl text-foreground">Log Feed</h2>
            <form onSubmit={(event) => createFeedLog(event).catch(() => undefined)} className="flex flex-col gap-3">
              <select name="feed_inventory_id" required className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground">
                <option value="">Select feed...</option>
                {feedInventory.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}{item.brand ? ` (${item.brand})` : ""}
                  </option>
                ))}
              </select>
              <input name="amount_lbs" type="number" step="0.1" required placeholder="Amount (lbs)" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground" />
              <input name="notes" placeholder="Notes (optional)" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground" />
              <button type="submit" className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                Save Feed Log
              </button>
            </form>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      <LogActivityDrawer
        projectId={Number(params.id)}
        projectName={project?.name ?? ""}
        isLivestock={project?.is_livestock ?? false}
        feedInventoryItems={feedInventory}
        targetWeight={project?.target_weight ?? null}
        onSuccess={() => load().catch(() => undefined)}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
