"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { apiClientJson, AuthStatus, MediaItem, Placing, Profile, Project, Show } from "@/lib/api";

function formatDate(value?: string | null) {
  if (!value) return "TBD";
  return new Date(value).toLocaleDateString();
}

function ribbonClass(ribbon?: string | null) {
  const key = (ribbon ?? "").toLowerCase();
  if (key.includes("blue")) return "bg-blue-700/70";
  if (key.includes("red")) return "bg-red-700/70";
  if (key.includes("white")) return "bg-slate-400/70 text-black";
  if (key.includes("purple")) return "bg-purple-700/70";
  return "bg-[var(--barn-bg)]";
}

export default function ShowDetailPage() {
  const params = useParams<{ id: string }>();
  const [show, setShow] = useState<Show | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [placings, setPlacings] = useState<Placing[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [showMediaCaption, setShowMediaCaption] = useState("");
  const [showMediaPlacingId, setShowMediaPlacingId] = useState("");

  const load = async () => {
    const [showData, projectData, profileData, placingData, mediaData, authData] = await Promise.all([
      apiClientJson<Show>(`/shows/${params.id}`),
      apiClientJson<Project[]>("/projects"),
      apiClientJson<Profile[]>("/profiles"),
      apiClientJson<Placing[]>(`/shows/${params.id}/placings`).catch(() => []),
      apiClientJson<MediaItem[]>(`/media?show_id=${params.id}`).catch(() => []),
      apiClientJson<AuthStatus>("/auth/status").catch(() => ({ role: null, is_unlocked: false, unlock_expires_at: null }))
    ]);
    setShow(showData);
    setProjects(projectData);
    setProfiles(profileData);
    setPlacings(placingData);
    setMedia(mediaData);
    setAuth(authData);
  };

  useEffect(() => {
    load().catch((loadError) => setError((loadError as Error).message));
  }, [params.id]);

  const addEntry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await apiClientJson(`/shows/${params.id}/entry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: Number(form.get("project_id")),
        class_name: String(form.get("class_name") || "").trim() || null,
        division: String(form.get("division") || "").trim() || null,
        weight: String(form.get("weight") || "").trim() || null,
        notes: String(form.get("stall_info") || "").trim() || null
      })
    });
    event.currentTarget.reset();
    await load();
  };

  const addDay = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await apiClientJson(`/shows/${params.id}/day`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: String(form.get("label") || "").trim() || undefined,
        date: form.get("date") || undefined,
        notes: String(form.get("notes") || "").trim() || undefined
      })
    });
    event.currentTarget.reset();
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
        show_day_id: form.get("show_day_id") ? Number(form.get("show_day_id")) : null,
        class_name: String(form.get("class_name") || "").trim() || null,
        placing: String(form.get("placing") || "").trim(),
        ribbon_type: String(form.get("ribbon_type") || "").trim() || null,
        notes: String(form.get("notes") || "").trim() || null
      })
    });
    event.currentTarget.reset();
    await load();
  };

  const uploadShowMedia = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.set("file", file);
    formData.set("show_id", String(params.id));
    formData.set("placing_id", showMediaPlacingId);
    formData.set("caption", showMediaCaption);
    formData.set("kind", "show");
    await apiClientJson("/media/upload", { method: "POST", body: formData });
    event.target.value = "";
    setShowMediaCaption("");
    setShowMediaPlacingId("");
    await load();
  };

  const projectMap = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const profileMap = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile.name])), [profiles]);

  if (error) return <p className="px-4 py-4 text-sm text-red-300">{error}</p>;
  if (!show) return <p className="px-4 py-4 text-sm text-[var(--barn-muted)]">Loading show...</p>;

  return (
    <div className="space-y-4 px-4 pb-6">
      <header className="barn-card space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold">{show.name}</h1>
            <p className="text-sm text-[var(--barn-muted)]">{show.location}</p>
            <p className="text-xs text-[var(--barn-muted)]">{formatDate(show.start_date)}{show.end_date ? ` to ${formatDate(show.end_date)}` : ""}</p>
          </div>
          {auth?.role === "parent" && auth.is_unlocked ? <Link href={`/shows/${show.id}/edit`} className="see-all-link">Edit</Link> : null}
        </div>
      </header>

      <section className="barn-card space-y-2">
        <h2 className="text-base font-semibold">Projects entered</h2>
        {show.entries.length === 0 ? <p className="barn-row text-sm text-[var(--barn-muted)]">No entries yet.</p> : null}
        {show.entries.map((entry) => {
          const project = projectMap.get(entry.project_id);
          const owner = project ? profileMap.get(project.owner_profile_id) : null;
          return (
            <article key={entry.id} className="barn-row text-sm">
              <p className="font-medium">{project?.name ?? `Project ${entry.project_id}`}</p>
              <p className="text-xs capitalize text-[var(--barn-muted)]">{project?.species ?? "Unknown species"} • {owner ?? "Unknown owner"}</p>
              <p className="text-xs text-[var(--barn-muted)]">Class: {entry.class_name || "Not set"}{entry.weight ? ` • ${entry.weight} lbs` : ""}</p>
              {entry.notes ? <p className="text-xs text-[var(--barn-muted)]">Stall: {entry.notes}</p> : null}
            </article>
          );
        })}

        <form className="grid gap-2 rounded-lg bg-[var(--barn-bg)] p-3 text-sm" onSubmit={(event) => addEntry(event).catch(() => undefined)}>
          <h3 className="font-medium">Add Project Entry</h3>
          <select name="project_id" className="rounded bg-black/20 p-2" required>
            <option value="">Select project</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
          <input name="class_name" placeholder="Class" className="rounded bg-black/20 p-2" />
          <input name="weight" placeholder="Weight / class notes" className="rounded bg-black/20 p-2" />
          <input name="division" placeholder="Division" className="rounded bg-black/20 p-2" />
          <input name="stall_info" placeholder="Stall info (optional)" className="rounded bg-black/20 p-2" />
          <button className="rounded bg-[var(--barn-red)] px-3 py-2 text-sm text-white">Save Entry</button>
        </form>
      </section>

      <section className="barn-card space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Show Days</h2>
        </div>
        {show.days.length === 0 ? <p className="barn-row text-sm text-[var(--barn-muted)]">No show days yet.</p> : null}
        {show.days.map((day) => (
          <Link key={day.id} href={`/shows/${show.id}/day/${day.id}`} className="barn-row block text-sm">
            <p className="font-medium">{day.label || `Day ${day.day_number}`}</p>
            <p className="text-xs text-[var(--barn-muted)]">{formatDate(day.show_date || day.date)}</p>
          </Link>
        ))}

        <form className="grid gap-2 rounded-lg bg-[var(--barn-bg)] p-3 text-sm" onSubmit={(event) => addDay(event).catch(() => undefined)}>
          <h3 className="font-medium">Add Show Day</h3>
          <input name="label" placeholder="Day label" className="rounded bg-black/20 p-2" />
          <input name="date" type="date" className="rounded bg-black/20 p-2" />
          <textarea name="notes" placeholder="Day notes" className="rounded bg-black/20 p-2" />
          <button className="rounded bg-[var(--barn-red)] px-3 py-2 text-sm text-white">Create Day</button>
        </form>
      </section>

      <section className="barn-card space-y-2">
        <h2 className="text-base font-semibold">Placings</h2>
        {placings.length === 0 ? <p className="barn-row text-sm text-[var(--barn-muted)]">No placings yet.</p> : null}
        {placings.map((placing) => (
          <article key={placing.id} className="barn-row flex items-center justify-between gap-2 text-sm">
            <div>
              <p className="font-medium">{projectMap.get(placing.project_id ?? -1)?.name ?? "Project"}</p>
              <p className="text-xs text-[var(--barn-muted)]">{placing.class_name || "Class not set"} • {placing.placing}</p>
            </div>
            <span className={`rounded-full px-2 py-1 text-xs ${ribbonClass(placing.ribbon_type)}`}>{placing.ribbon_type || "Ribbon"}</span>
          </article>
        ))}

        <form className="grid gap-2 rounded-lg bg-[var(--barn-bg)] p-3 text-sm" onSubmit={(event) => addPlacing(event).catch(() => undefined)}>
          <h3 className="font-medium">Add Placing / Ribbon</h3>
          <select name="project_id" className="rounded bg-black/20 p-2" required>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
          <select name="show_day_id" className="rounded bg-black/20 p-2">
            <option value="">No specific day</option>
            {show.days.map((day) => <option key={day.id} value={day.id}>{day.label || `Day ${day.day_number}`}</option>)}
          </select>
          <input name="class_name" placeholder="Class" className="rounded bg-black/20 p-2" />
          <input name="placing" placeholder="Placing" className="rounded bg-black/20 p-2" required />
          <input name="ribbon_type" placeholder="Ribbon color" className="rounded bg-black/20 p-2" />
          <textarea name="notes" placeholder="Notes" className="rounded bg-black/20 p-2" />
          <button className="rounded bg-[var(--barn-red)] px-3 py-2 text-sm text-white">Save Placing</button>
        </form>
      </section>

      <section className="barn-card space-y-2">
        <div className="space-y-2">
          <h2 className="text-base font-semibold">Show Media</h2>
          <div className="flex flex-wrap gap-2">
            <input value={showMediaCaption} onChange={(event) => setShowMediaCaption(event.target.value)} placeholder="Caption" className="rounded bg-black/20 px-2 py-1 text-xs" />
            <select value={showMediaPlacingId} onChange={(event) => setShowMediaPlacingId(event.target.value)} className="rounded bg-black/20 px-2 py-1 text-xs">
              <option value="">No placing tag</option>
              {placings.map((placing) => <option key={placing.id} value={placing.id}>{placing.placing}</option>)}
            </select>
            <label className="rounded bg-[var(--barn-red)] px-3 py-2 text-xs text-white">
              Upload
              <input type="file" accept="image/*,video/mp4,video/quicktime,video/mov" className="hidden" onChange={(event) => uploadShowMedia(event).catch(() => undefined)} />
            </label>
          </div>
        </div>
        {media.length === 0 ? <p className="barn-row text-sm text-[var(--barn-muted)]">No media uploaded yet.</p> : null}
        <div className="grid grid-cols-2 gap-2">
          {media.map((item) => (
            <a key={item.id} href={item.file_url || item.url} className="rounded bg-black/20 p-2 text-xs">
              <img src={item.file_url || item.url} alt={item.caption || item.file_name} className="h-28 w-full rounded object-cover" loading="lazy" />
              <p className="mt-1 truncate">{item.caption || item.file_name}</p>
              <p className="text-[10px] text-[var(--barn-muted)]">{item.show_name || show.name}{item.placing_value ? ` • ${item.placing_value}` : ""}{item.ribbon_type ? ` • ${item.ribbon_type}` : ""}</p>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
