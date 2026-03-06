"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { apiClientJson, MediaItem, Placing, Profile, Project, Show, ShowDayTask } from "@/lib/api";

const livestockChecklistTemplates = [
  { key: "wash", label: "Wash animal" },
  { key: "groom", label: "Groom" },
  { key: "pack", label: "Pack supplies" },
  { key: "feed", label: "Feed" },
  { key: "walk", label: "Walk" },
  { key: "weigh", label: "Weigh-in" },
  { key: "ring", label: "Enter ring" }
];

const projectChecklistTemplates = [
  { key: "prep", label: "Prep project" },
  { key: "pack", label: "Pack supplies" },
  { key: "setup", label: "Set up display" },
  { key: "practice", label: "Practice presentation" },
  { key: "checkin", label: "Check in" },
  { key: "judge", label: "Meet judging schedule" },
  { key: "cleanup", label: "Clean up" }
];

function formatDate(value?: string | null) {
  if (!value) return "TBD";
  return new Date(value).toLocaleDateString();
}

export default function ShowDayModePage() {
  const params = useParams<{ id: string; dayId: string }>();
  const [show, setShow] = useState<Show | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [tasks, setTasks] = useState<ShowDayTask[]>([]);
  const [dayPlacings, setDayPlacings] = useState<Placing[]>([]);
  const [dayMedia, setDayMedia] = useState<MediaItem[]>([]);

  const load = async () => {
    const [showData, projectData, profileData, taskData, placingData, mediaData] = await Promise.all([
      apiClientJson<Show>(`/shows/${params.id}`),
      apiClientJson<Project[]>("/projects"),
      apiClientJson<Profile[]>("/profiles"),
      apiClientJson<ShowDayTask[]>(`/show-days/${params.dayId}/tasks`).catch(() => []),
      apiClientJson<Placing[]>(`/shows/${params.id}/placings`).then((rows) => rows.filter((row) => row.show_day_id === Number(params.dayId))).catch(() => []),
      apiClientJson<MediaItem[]>(`/media?show_day_id=${params.dayId}`).catch(() => [])
    ]);

    setShow(showData);
    setProjects(projectData);
    setProfiles(profileData);
    setTasks(taskData);
    setDayPlacings(placingData);
    setDayMedia(mediaData);
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [params.id, params.dayId]);

  const toggleTask = async (projectId: number, taskKey: string, taskLabel: string) => {
    const existing = tasks.find((task) => task.project_id === projectId && task.task_key === taskKey);

    if (!existing) {
      await apiClientJson(`/show-days/${params.dayId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          task_key: taskKey,
          task_label: taskLabel,
          is_completed: true
        })
      });
    } else {
      await apiClientJson(`/show-day-tasks/${existing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_completed: !existing.is_completed })
      });
    }

    await load();
  };

  const addPlacing = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await apiClientJson(`/shows/${params.id}/placing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: Number(form.get("project_id")),
        show_day_id: Number(params.dayId),
        class_name: String(form.get("class_name") || "").trim() || null,
        placing: String(form.get("placing") || "").trim(),
        ribbon_type: String(form.get("ribbon_type") || "").trim() || null,
        notes: String(form.get("notes") || "").trim() || null
      })
    });
    event.currentTarget.reset();
    await load();
  };


  const uploadDayMedia = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.set("file", file);
    form.set("show_id", String(params.id));
    form.set("show_day_id", String(params.dayId));
    form.set("project_id", String(show.entries[0]?.project_id || ""));
    form.set("kind", "show_day");
    await apiClientJson("/media/upload", { method: "POST", body: form });
    event.target.value = "";
    await load();
  };

  const projectMap = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const profileMap = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile.name])), [profiles]);

  if (!show) return <p className="px-4 py-4 text-sm text-[var(--barn-muted)]">Loading show day...</p>;

  const day = show.days.find((item) => item.id === Number(params.dayId));

  return (
    <div className="space-y-3 px-3 pb-6">
      <header className="barn-card space-y-1">
        <h1 className="text-xl font-semibold">{show.name}</h1>
        <p className="text-sm text-[var(--barn-muted)]">{day?.label || `Day ${day?.day_number ?? ""}`}</p>
        <p className="text-xs text-[var(--barn-muted)]">{formatDate(day?.show_date || day?.date)}</p>
      </header>

      {show.entries.length === 0 ? (
        <section className="barn-card space-y-2 text-sm text-[var(--barn-muted)]">
          <p>No entries are attached to this show yet.</p>
          <Link href={`/shows/${show.id}`} className="see-all-link">Open show and add entries</Link>
        </section>
      ) : null}

      {show.entries.map((entry) => {
        const project = projectMap.get(entry.project_id);
        const owner = profileMap.get(project?.owner_profile_id ?? -1) ?? "Unknown owner";

        return (
          <section key={entry.id} className="barn-card space-y-2">
            <div>
              <h2 className="text-lg font-semibold">{project?.name ?? `Project ${entry.project_id}`}</h2>
              <p className="text-xs capitalize text-[var(--barn-muted)]">{project?.species ?? "Unknown species"} • {owner}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(project?.is_livestock ? livestockChecklistTemplates : projectChecklistTemplates).map((template) => {
                const row = tasks.find((task) => task.project_id === entry.project_id && task.task_key === template.key);
                return (
                  <button
                    key={template.key}
                    type="button"
                    onClick={() => toggleTask(entry.project_id, template.key, template.label).catch(() => undefined)}
                    className={`min-h-14 rounded-lg border px-3 py-2 text-left text-sm ${row?.is_completed ? "border-emerald-500 bg-emerald-700/40" : "border-[var(--barn-border)] bg-[var(--barn-bg)]"}`}
                  >
                    <p className="font-medium">{template.label}</p>
                    <p className="text-xs text-[var(--barn-muted)]">{row?.is_completed ? `Done ${formatDate(row.completed_at)}` : "Tap to mark complete"}</p>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}


      <section className="barn-card space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Day media</h2>
          <label className="rounded bg-[var(--barn-red)] px-3 py-2 text-xs text-white">
            Upload
            <input type="file" accept="image/*,video/mp4,video/quicktime,video/mov" className="hidden" onChange={(event) => uploadDayMedia(event).catch(() => undefined)} />
          </label>
        </div>
        {dayMedia.length === 0 ? <p className="barn-row text-xs text-[var(--barn-muted)]">No day media yet.</p> : null}
        <div className="grid grid-cols-3 gap-2">
          {dayMedia.map((item) => <img key={item.id} src={item.file_url || item.url} alt={item.caption || item.file_name} className="h-20 w-full rounded object-cover" loading="lazy" />)}
        </div>
      </section>

      <section className="barn-card space-y-2">
        <h2 className="text-base font-semibold">Add placing / ribbon</h2>
        <form className="grid gap-2 text-sm" onSubmit={(event) => addPlacing(event).catch(() => undefined)}>
          <select name="project_id" className="min-h-12 rounded bg-[var(--barn-bg)] px-3" required>
            {show.entries.map((entry) => <option key={entry.id} value={entry.project_id}>{projectMap.get(entry.project_id)?.name ?? entry.project_id}</option>)}
          </select>
          <input name="class_name" placeholder="Class" className="min-h-12 rounded bg-[var(--barn-bg)] px-3" />
          <input name="placing" placeholder="Placing" className="min-h-12 rounded bg-[var(--barn-bg)] px-3" required />
          <input name="ribbon_type" placeholder="Ribbon color" className="min-h-12 rounded bg-[var(--barn-bg)] px-3" />
          <textarea name="notes" placeholder="Notes" className="rounded bg-[var(--barn-bg)] px-3 py-2" />
          <button className="min-h-12 rounded bg-[var(--barn-red)] text-sm font-medium text-white">Save placing</button>
        </form>

        {dayPlacings.length === 0 ? <p className="barn-row text-xs text-[var(--barn-muted)]">No placings for this day yet.</p> : null}
        {dayPlacings.map((placing) => (
          <article key={placing.id} className="barn-row text-sm">
            <p className="font-medium">{projectMap.get(placing.project_id ?? -1)?.name ?? "Project"}</p>
            <p className="text-xs text-[var(--barn-muted)]">{placing.class_name || "Class"} • {placing.placing} • {placing.ribbon_type || "Ribbon"}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
