"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { AuthStatus, MediaItem, Placing, Profile, Project, Show, apiClientJson } from "@/lib/api";
import { toUserErrorMessage } from "@/lib/errorMessage";
import { detectMediaType, ribbonBadgeClass } from "@/lib/media";
import { MediaViewer } from "@/components/media-viewer";

const pageSize = 24;

export default function ProjectGalleryPage() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);

  const [project, setProject] = useState<Project | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [placings, setPlacings] = useState<Placing[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "photo" | "video" | "ribbon">("all");
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const canManage = auth?.role === "parent" && auth.is_unlocked;

  const load = async () => {
    const [projectData, mediaData, placingData, showData, profileData, authData] = await Promise.all([
      apiClientJson<Project>(`/projects/${projectId}`),
      apiClientJson<MediaItem[]>(`/projects/${projectId}/media`),
      apiClientJson<Placing[]>(`/projects/${projectId}/placings`).catch(() => []),
      apiClientJson<Show[]>("/shows").catch(() => []),
      apiClientJson<Profile[]>("/profiles").catch(() => []),
      apiClientJson<AuthStatus>("/auth/status").catch(() => null)
    ]);
    setProject(projectData);
    setMedia(mediaData);
    setPlacings(placingData);
    setShows(showData);
    setProfiles(profileData);
    setAuth(authData);
  };

  useEffect(() => {
    load().then(() => setError(null)).catch((loadError) => setError(toUserErrorMessage(loadError, "Unable to load the project gallery.")));
  }, [projectId]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const filtered = useMemo(() => {
    if (filter === "all") return media;
    return media.filter((item) => detectMediaType(item) === filter);
  }, [media, filter]);

  const shown = filtered.slice(0, visibleCount);

  const startUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setUploadFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const submitUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!uploadFile) return;

    const form = new FormData(event.currentTarget);
    const payload = new FormData();
    payload.set("file", uploadFile);
    payload.set("project_id", String(projectId));
    payload.set("kind", "project");
    payload.set("caption", String(form.get("caption") || ""));
    payload.set("show_id", String(form.get("show_id") || ""));
    payload.set("placing_id", String(form.get("placing_id") || ""));
    payload.set("helper_profile_id", String(form.get("helper_profile_id") || ""));
    payload.set("tags", String(form.get("tags") || ""));

    const extension = uploadFile.name.split(".").pop()?.toLowerCase() || "";
    if (["mp4", "mov", "m4v", "webm"].includes(extension) || uploadFile.type.startsWith("video/")) payload.set("media_type", "video");

    setUploading(true);
    try {
      await apiClientJson("/media/upload", { method: "POST", body: payload });
      event.currentTarget.reset();
      setUploadFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setError(null);
      await load();
    } catch (uploadError) {
      setError(toUserErrorMessage(uploadError, "Unable to upload media for this project."));
    } finally {
      setUploading(false);
    }
  };

  const deleteMedia = async (mediaId: number) => {
    if (!window.confirm("Delete this media item?")) return;
    try {
      await apiClientJson(`/media/${mediaId}`, { method: "DELETE" });
      await load();
    } catch (deleteError) {
      setError(toUserErrorMessage(deleteError, "Unable to delete this media item."));
    }
  };

  if (!project) return <p className="px-4 py-4 text-sm">Loading gallery...</p>;

  return (
    <div className="space-y-3 px-3 pb-6">
      <header className="rounded-2xl bg-card border border-border shadow-sm p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">{project.name} Gallery</h1>
          <Link href={`/projects/${project.id}`} className="text-sm text-primary underline">Back</Link>
        </div>

        <div className="flex flex-wrap gap-2">
          {["all", "photo", "video", "ribbon"].map((key) => (
            <button key={key} type="button" onClick={() => { setFilter(key as typeof filter); setVisibleCount(pageSize); }} className={`rounded-full px-3 py-1 text-xs ${filter === key ? "bg-primary text-primary-foreground" : "bg-background"}`}>
              {key === "all" ? "All" : key === "photo" ? "Photos" : key === "video" ? "Videos" : "Ribbons"}
            </button>
          ))}
        </div>
        {error ? <p className="rounded bg-red-500/10 p-2 text-sm text-red-200">{error}</p> : null}
      </header>

      <section className="rounded-2xl bg-card border border-border shadow-sm p-4 space-y-2 text-sm">
        <h2 className="text-base font-semibold">Upload media</h2>
        <form className="grid gap-2" onSubmit={(event) => submitUpload(event).catch(() => undefined)}>
          <label className={`rounded px-3 py-3 text-sm ${canManage ? "bg-background" : "bg-secondary text-foreground/60"}`}>
            Select file
            <input disabled={!canManage} type="file" accept="image/*,video/mp4,video/quicktime,video/mov" className="hidden" onChange={startUpload} />
          </label>
          {previewUrl ? (
            <div className="rounded border border-border bg-background p-2">
              {uploadFile?.type.startsWith("video/") ? <video src={previewUrl} className="h-36 w-full rounded object-cover" controls /> : <img src={previewUrl} alt="Preview" className="h-36 w-full rounded object-cover" />}
            </div>
          ) : null}
          <input name="caption" placeholder="Caption (optional)" className="rounded bg-background p-3" />
          <select name="show_id" className="rounded bg-background p-3">
            <option value="">Link to show (optional)</option>
            {shows.map((show) => <option key={show.id} value={show.id}>{show.name}</option>)}
          </select>
          <select name="placing_id" className="rounded bg-background p-3">
            <option value="">Link to placing (optional)</option>
            {placings.map((placing) => <option key={placing.id} value={placing.id}>{placing.placing}{placing.ribbon_type ? ` • ${placing.ribbon_type}` : ""}</option>)}
          </select>
          <select name="helper_profile_id" className="rounded bg-background p-3">
            <option value="">Helper attribution (optional)</option>
            {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
          </select>
          <input name="tags" placeholder="Tags (comma separated)" className="rounded bg-background p-3" />
          <button disabled={!uploadFile || uploading || !canManage} className="rounded bg-primary px-3 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">{uploading ? "Uploading..." : "Save media"}</button>
        </form>
      </section>

      <section className="grid grid-cols-3 gap-2">
        {shown.map((item, index) => {
          const mediaType = detectMediaType(item);
          return (
            <div key={item.id} className="space-y-1 rounded bg-background p-1">
              <button type="button" onClick={() => setActiveIndex(index)} className="relative block w-full overflow-hidden rounded">
                {mediaType === "video" ? (
                  <video src={item.file_url || item.url} className="h-24 w-full object-cover" muted playsInline preload="metadata" />
                ) : (
                  <img src={item.file_url || item.url} alt={item.caption || item.file_name} loading="lazy" className="h-24 w-full object-cover" />
                )}
                {item.ribbon_type ? <span className={`absolute left-1 top-1 rounded px-1.5 py-0.5 text-[10px] ${ribbonBadgeClass(item.ribbon_type)}`}>{item.ribbon_type}</span> : null}
                {item.show_name ? <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px]">{item.show_name}</span> : null}
                {item.placing_value ? <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px]">{item.placing_value}</span> : null}
              </button>
              {canManage ? <button type="button" onClick={() => deleteMedia(item.id).catch(() => undefined)} className="w-full rounded bg-secondary text-foreground px-2 py-1 text-[10px]">Delete</button> : null}
            </div>
          );
        })}
      </section>

      {visibleCount < filtered.length ? (
        <button type="button" onClick={() => setVisibleCount((value) => value + pageSize)} className="w-full rounded bg-background py-3 text-sm">
          Load more
        </button>
      ) : null}

      {activeIndex !== null ? (
        <MediaViewer
          items={shown}
          initialIndex={activeIndex}
          auth={auth}
          onClose={() => setActiveIndex(null)}
          onChanged={load}
        />
      ) : null}
    </div>
  );
}
