"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { apiClientJson, AuthStatus, MediaItem, Placing, Profile, Project, Show } from "@/lib/api";
import { toUserErrorMessage } from "@/lib/errorMessage";
import { detectMediaType } from "@/lib/media";

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
  return "bg-background";
}

export default function ShowDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [show, setShow] = useState<Show | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [placings, setPlacings] = useState<Placing[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [showMediaCaption, setShowMediaCaption] = useState("");
  const [showMediaPlacingId, setShowMediaPlacingId] = useState("");

  const canManage = auth?.role === "parent" && auth.is_unlocked;

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
    load().then(() => setError(null)).catch((loadError) => setError(toUserErrorMessage(loadError, "Unable to load this show.")));
  }, [params.id]);

  const addEntry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
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
    } catch (submitError) {
      setError(toUserErrorMessage(submitError, "Unable to save this show entry."));
    }
  };

  const addDay = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
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
    } catch (submitError) {
      setError(toUserErrorMessage(submitError, "Unable to add this show day."));
    }
  };

  const addPlacing = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
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
    } catch (submitError) {
      setError(toUserErrorMessage(submitError, "Unable to save this placing."));
    }
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
    try {
      await apiClientJson("/media/upload", { method: "POST", body: formData });
      setShowMediaCaption("");
      setShowMediaPlacingId("");
      setError(null);
      await load();
    } catch (uploadError) {
      setError(toUserErrorMessage(uploadError, "Unable to upload show media."));
    } finally {
      event.target.value = "";
    }
  };

  const removeShowDay = async (dayId: number) => {
    if (!window.confirm("Delete this show day and its day-specific placings/media?")) return;
    try {
      await apiClientJson(`/show-days/${dayId}`, { method: "DELETE" });
      await load();
    } catch (deleteError) {
      setError(toUserErrorMessage(deleteError, "Unable to delete this show day."));
    }
  };

  const removePlacing = async (placingId: number) => {
    if (!window.confirm("Delete this placing?")) return;
    try {
      await apiClientJson(`/placings/${placingId}`, { method: "DELETE" });
      await load();
    } catch (deleteError) {
      setError(toUserErrorMessage(deleteError, "Unable to delete this placing."));
    }
  };

  const removeMedia = async (mediaId: number) => {
    if (!window.confirm("Delete this media item?")) return;
    try {
      await apiClientJson(`/media/${mediaId}`, { method: "DELETE" });
      await load();
    } catch (deleteError) {
      setError(toUserErrorMessage(deleteError, "Unable to delete this media item."));
    }
  };

  const removeShow = async () => {
    if (!show || !window.confirm("Delete this show? Entries, placings, and media links will be hidden.")) return;
    try {
      await apiClientJson(`/shows/${show.id}`, { method: "DELETE" });
      router.push("/shows");
      router.refresh();
    } catch (deleteError) {
      setError(toUserErrorMessage(deleteError, "Unable to delete this show."));
    }
  };

  const removeEntry = async (entryId: number) => {
    if (!window.confirm("Delete this show entry and its placings?")) return;
    try {
      await apiClientJson(`/entries/${entryId}`, { method: "DELETE" });
      await load();
    } catch (deleteError) {
      setError(toUserErrorMessage(deleteError, "Unable to delete this entry."));
    }
  };

  const projectMap = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const profileMap = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile.name])), [profiles]);

  if (!show) return <p className="px-4 py-4 text-sm text-muted-foreground">Loading show...</p>;

  return (
    <div className="space-y-4 px-4 pb-6">
      <header className="rounded-2xl bg-card border border-border shadow-sm p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold">{show.name}</h1>
            <p className="text-sm text-muted-foreground">{show.location}</p>
            <p className="text-xs text-muted-foreground">{formatDate(show.start_date)}{show.end_date ? ` → ${formatDate(show.end_date)}` : ""}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/shows/${show.id}/edit`} className="rounded bg-neutral-700 px-3 py-2 text-xs">Edit</Link>
            {canManage ? <button type="button" onClick={() => removeShow().catch(() => undefined)} className="rounded bg-red-900 px-3 py-2 text-xs">Delete</button> : null}
          </div>
        </div>
        {show.notes ? <p className="text-sm text-muted-foreground">{show.notes}</p> : null}
        {error ? <p className="rounded bg-red-500/10 p-2 text-sm text-red-200">{error}</p> : null}
      </header>

      <section className="rounded-2xl bg-card border border-border shadow-sm p-4 space-y-2">
        <h2 className="text-base font-semibold">Entries</h2>
        {show.entries.length === 0 ? <p className="text-sm text-muted-foreground text-sm text-muted-foreground">No entries yet.</p> : null}
        {show.entries.map((entry) => (
          <article key={entry.id} className="text-sm text-muted-foreground flex items-center justify-between gap-2 text-sm">
            <div>
              <p className="font-medium">{projectMap.get(entry.project_id)?.name ?? `Project ${entry.project_id}`}</p>
              <p className="text-xs text-muted-foreground">{entry.class_name || "Class pending"} • {entry.division || "Division pending"}</p>
              <p className="text-xs text-muted-foreground">Owner: {profileMap.get(projectMap.get(entry.project_id)?.owner_profile_id ?? -1) ?? "Unknown"}</p>
            </div>
            {canManage ? <button type="button" onClick={() => removeEntry(entry.id).catch(() => undefined)} className="rounded bg-neutral-700 px-2 py-1 text-xs">Delete</button> : null}
          </article>
        ))}

        <form className="grid gap-2 rounded-lg bg-background p-3 text-sm" onSubmit={(event) => addEntry(event).catch(() => undefined)}>
          <h3 className="font-medium">Add Entry</h3>
          <select name="project_id" className="rounded bg-background border border-border p-2" required>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
          <input name="class_name" placeholder="Class" className="rounded bg-background border border-border p-2" />
          <input name="weight" placeholder="Weight / class notes" className="rounded bg-background border border-border p-2" />
          <input name="division" placeholder="Division" className="rounded bg-background border border-border p-2" />
          <input name="stall_info" placeholder="Stall info (optional)" className="rounded bg-background border border-border p-2" />
          <button disabled={!canManage} className="rounded bg-primary px-3 py-2 text-sm text-white disabled:opacity-60">Save Entry</button>
        </form>
      </section>

      <section className="rounded-2xl bg-card border border-border shadow-sm p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Show Days</h2>
        </div>
        {show.days.length === 0 ? <p className="text-sm text-muted-foreground text-sm text-muted-foreground">No show days yet.</p> : null}
        {show.days.map((day) => (
          <div key={day.id} className="text-sm text-muted-foreground flex items-center justify-between gap-2 text-sm">
            <Link href={`/shows/${show.id}/day/${day.id}`} className="block flex-1">
              <p className="font-medium">{day.label || `Day ${day.day_number}`}</p>
              <p className="text-xs text-muted-foreground">{formatDate(day.show_date || day.date)}</p>
            </Link>
            {canManage ? <button type="button" onClick={() => removeShowDay(day.id).catch(() => undefined)} className="rounded bg-neutral-700 px-2 py-1 text-xs">Delete</button> : null}
          </div>
        ))}

        <form className="grid gap-2 rounded-lg bg-background p-3 text-sm" onSubmit={(event) => addDay(event).catch(() => undefined)}>
          <h3 className="font-medium">Add Show Day</h3>
          <input name="label" placeholder="Day label" className="rounded bg-background border border-border p-2" />
          <input name="date" type="date" className="rounded bg-background border border-border p-2" />
          <textarea name="notes" placeholder="Day notes" className="rounded bg-background border border-border p-2" />
          <button disabled={!canManage} className="rounded bg-primary px-3 py-2 text-sm text-white disabled:opacity-60">Create Day</button>
        </form>
      </section>

      <section className="rounded-2xl bg-card border border-border shadow-sm p-4 space-y-2">
        <h2 className="text-base font-semibold">Placings</h2>
        {placings.length === 0 ? <p className="text-sm text-muted-foreground text-sm text-muted-foreground">No placings yet.</p> : null}
        {placings.map((placing) => (
          <article key={placing.id} className="text-sm text-muted-foreground flex items-center justify-between gap-2 text-sm">
            <div>
              <p className="font-medium">{projectMap.get(placing.project_id ?? -1)?.name ?? "Project"}</p>
              <p className="text-xs text-muted-foreground">{placing.class_name || "Class not set"} • {placing.placing}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-1 text-xs ${ribbonClass(placing.ribbon_type)}`}>{placing.ribbon_type || "Ribbon"}</span>
              {canManage ? <button type="button" onClick={() => removePlacing(placing.id).catch(() => undefined)} className="rounded bg-neutral-700 px-2 py-1 text-xs">Delete</button> : null}
            </div>
          </article>
        ))}

        <form className="grid gap-2 rounded-lg bg-background p-3 text-sm" onSubmit={(event) => addPlacing(event).catch(() => undefined)}>
          <h3 className="font-medium">Add Placing / Ribbon</h3>
          <select name="project_id" className="rounded bg-background border border-border p-2" required>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
          <select name="show_day_id" className="rounded bg-background border border-border p-2">
            <option value="">No specific day</option>
            {show.days.map((day) => <option key={day.id} value={day.id}>{day.label || `Day ${day.day_number}`}</option>)}
          </select>
          <input name="class_name" placeholder="Class" className="rounded bg-background border border-border p-2" />
          <input name="placing" placeholder="Placing" className="rounded bg-background border border-border p-2" required />
          <input name="ribbon_type" placeholder="Ribbon color" className="rounded bg-background border border-border p-2" />
          <textarea name="notes" placeholder="Notes" className="rounded bg-background border border-border p-2" />
          <button disabled={!canManage} className="rounded bg-primary px-3 py-2 text-sm text-white disabled:opacity-60">Save Placing</button>
        </form>
      </section>

      <section className="rounded-2xl bg-card border border-border shadow-sm p-4 space-y-2">
        <div className="space-y-2">
          <h2 className="text-base font-semibold">Show Media</h2>
          <div className="flex flex-wrap gap-2">
            <input value={showMediaCaption} onChange={(event) => setShowMediaCaption(event.target.value)} placeholder="Caption" className="rounded bg-background border border-border px-2 py-1 text-xs" />
            <select value={showMediaPlacingId} onChange={(event) => setShowMediaPlacingId(event.target.value)} className="rounded bg-background border border-border px-2 py-1 text-xs">
              <option value="">No placing tag</option>
              {placings.map((placing) => <option key={placing.id} value={placing.id}>{placing.placing}</option>)}
            </select>
            <label className={`rounded px-3 py-2 text-xs text-white ${canManage ? "bg-primary" : "bg-neutral-700"}`}>
              Upload
              <input disabled={!canManage} type="file" accept="image/*,video/mp4,video/quicktime,video/mov" className="hidden" onChange={(event) => uploadShowMedia(event).catch(() => undefined)} />
            </label>
          </div>
        </div>
        {media.length === 0 ? <p className="text-sm text-muted-foreground text-sm text-muted-foreground">No media uploaded yet.</p> : null}
        <div className="grid grid-cols-2 gap-2">
          {media.map((item) => {
            const mediaUrl = item.file_url || item.url;
            const mediaType = detectMediaType(item);
            return (
              <div key={item.id} className="rounded bg-background border border-border p-2 text-xs">
                <a href={mediaUrl}>
                  {mediaType === "video" ? <video src={mediaUrl} className="h-28 w-full rounded object-cover" muted playsInline preload="metadata" /> : <img src={mediaUrl} alt={item.caption || item.file_name} className="h-28 w-full rounded object-cover" loading="lazy" />}
                </a>
                <p className="mt-1 truncate">{item.caption || item.file_name}</p>
                <p className="text-[10px] text-muted-foreground">{item.show_name || show.name}{item.placing_value ? ` • ${item.placing_value}` : ""}{item.ribbon_type ? ` • ${item.ribbon_type}` : ""}</p>
                {canManage ? <button type="button" onClick={() => removeMedia(item.id).catch(() => undefined)} className="mt-1 rounded bg-neutral-700 px-2 py-1 text-[10px]">Delete</button> : null}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
