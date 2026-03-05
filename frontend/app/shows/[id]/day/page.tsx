"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { apiClientJson, Profile, Project, Show } from "@/lib/api";

const statusItems = ["Weighed-in", "Checked-in", "Washed", "Clipped", "In-ring", "Placed"];
const checklistTemplates: Record<string, string[]> = {
  goat: ["Halter", "Brush", "Hoof trim check", "Water bucket", "Health papers"],
  steer: ["Show stick", "Blower", "Feed pan", "Water bucket", "Health papers"],
  pig: ["Sorting board", "Water sprayer", "Brush", "Feed scoop", "Health papers"]
};

type LocalState = { statuses: Record<string, boolean>; notes: string; checklist: Record<string, boolean> };

export default function ShowDayPage() {
  const params = useParams<{ id: string }>();
  const [show, setShow] = useState<Show | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedDayId, setSelectedDayId] = useState<number | null>(null);
  const [localByEntry, setLocalByEntry] = useState<Record<number, LocalState>>({});

  const storageKey = `show-day-${params.id}`;

  const load = async () => {
    const [showData, projectData, profileData] = await Promise.all([
      apiClientJson<Show>(`/shows/${params.id}`),
      apiClientJson<Project[]>("/projects"),
      apiClientJson<Profile[]>("/profiles")
    ]);
    setShow(showData);
    setProjects(projectData);
    setProfiles(profileData);
    setSelectedDayId(showData.days[0]?.id ?? null);
  };

  useEffect(() => {
    load().catch(() => undefined);
    const saved = window.localStorage.getItem(storageKey);
    if (saved) setLocalByEntry(JSON.parse(saved));
  }, [params.id]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(localByEntry));
  }, [localByEntry, storageKey]);

  const projectMap = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const profileMap = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile])), [profiles]);

  const toggleStatus = (entryId: number, key: string) => {
    setLocalByEntry((prev) => ({
      ...prev,
      [entryId]: {
        statuses: { ...(prev[entryId]?.statuses ?? {}), [key]: !(prev[entryId]?.statuses?.[key]) },
        notes: prev[entryId]?.notes ?? "",
        checklist: prev[entryId]?.checklist ?? {}
      }
    }));
  };

  const saveNotes = (entryId: number, notes: string) => {
    setLocalByEntry((prev) => ({ ...prev, [entryId]: { statuses: prev[entryId]?.statuses ?? {}, checklist: prev[entryId]?.checklist ?? {}, notes } }));
  };

  const toggleChecklist = (entryId: number, item: string) => {
    setLocalByEntry((prev) => ({
      ...prev,
      [entryId]: {
        statuses: prev[entryId]?.statuses ?? {},
        notes: prev[entryId]?.notes ?? "",
        checklist: { ...(prev[entryId]?.checklist ?? {}), [item]: !(prev[entryId]?.checklist?.[item]) }
      }
    }));
  };

  const addPlacing = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedDayId) return;
    const form = new FormData(event.currentTarget);
    const timestamp = String(form.get("timestamp") ?? "");
    await apiClientJson(`/entries/${form.get("entry_id")}/placings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        show_day_id: selectedDayId,
        placing: form.get("placing"),
        ring: form.get("class_name"),
        notes: `${String(form.get("notes") ?? "")} ${timestamp ? `@ ${timestamp}` : ""}`.trim()
      })
    });
    event.currentTarget.reset();
    await load();
  };

  if (!show) return <p>Loading show day...</p>;

  return <div className="space-y-4 pb-2">
    <header className="rounded border border-white/10 bg-neutral-900 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">{show.name} • Show Day</h1>
          <p className="text-sm text-neutral-300">{show.location} • {show.start_date.slice(0, 10)}{show.end_date ? ` to ${show.end_date.slice(0, 10)}` : ""}</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-amber-300">Checklist/status/notes are currently local-only and not saved to API.</p>
      <div className="mt-2 flex gap-2 overflow-x-auto">{show.days.map((day) => <button key={day.id} onClick={() => setSelectedDayId(day.id)} className={`rounded px-3 py-1 text-xs ${selectedDayId === day.id ? "bg-red-700" : "bg-neutral-800"}`}>Day {day.day_number}</button>)}</div>
    </header>

    <section className="space-y-3">
      <h2 className="font-semibold">Animals attending</h2>
      {show.entries.length === 0 ? <p className="rounded bg-neutral-900 p-3 text-sm text-neutral-300">No animals entered for this show.</p> : null}
      {show.entries.map((entry) => {
        const project = projectMap.get(entry.project_id);
        const owner = profileMap.get(project?.owner_profile_id ?? -1);
        const template = checklistTemplates[project?.species ?? ""] ?? checklistTemplates.goat;
        return <article key={entry.id} className="space-y-2 rounded border border-white/10 bg-neutral-900 p-3">
          <div><p className="font-semibold">{project?.name ?? `Project ${entry.project_id}`}</p><p className="text-xs capitalize text-neutral-400">{project?.species ?? "unknown"} • {owner?.name ?? "Unknown kid"}</p></div>
          <div className="flex flex-wrap gap-2">{statusItems.map((pill) => <button key={pill} onClick={() => toggleStatus(entry.id, pill)} className={`rounded-full px-3 py-1 text-xs ${localByEntry[entry.id]?.statuses?.[pill] ? "bg-emerald-700" : "bg-neutral-800"}`}>{pill}</button>)}</div>
          <textarea placeholder="Quick notes" value={localByEntry[entry.id]?.notes ?? ""} onChange={(event) => saveNotes(entry.id, event.target.value)} className="w-full rounded bg-neutral-800 p-2 text-sm" />
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-neutral-300">Checklist</p>
            <div className="grid gap-1">{template.map((item) => <button key={item} onClick={() => toggleChecklist(entry.id, item)} className={`rounded px-2 py-1 text-left text-xs ${localByEntry[entry.id]?.checklist?.[item] ? "bg-emerald-900" : "bg-neutral-800"}`}>{localByEntry[entry.id]?.checklist?.[item] ? "✅" : "⬜"} {item}</button>)}</div>
          </div>
        </article>;
      })}
    </section>

    <section className="space-y-2 rounded border border-white/10 bg-neutral-900 p-3">
      <h2 className="font-semibold">Placings</h2>
      <form onSubmit={addPlacing} className="grid gap-2 sm:grid-cols-2">
        <select name="entry_id" className="rounded bg-neutral-800 p-2" required>{show.entries.map((entry) => <option key={entry.id} value={entry.id}>{projectMap.get(entry.project_id)?.name ?? `Project ${entry.project_id}`}</option>)}</select>
        <input name="class_name" placeholder="Class" className="rounded bg-neutral-800 p-2" />
        <input name="placing" placeholder="Placing" className="rounded bg-neutral-800 p-2" required />
        <input name="timestamp" type="datetime-local" defaultValue={new Date().toISOString().slice(0, 16)} className="rounded bg-neutral-800 p-2" />
        <textarea name="notes" placeholder="Notes" className="rounded bg-neutral-800 p-2 sm:col-span-2" />
        <button className="rounded bg-red-700 px-3 py-2 sm:col-span-2">Add placing</button>
      </form>
      <div className="space-y-2">{show.entries.map((entry) => {
        const project = projectMap.get(entry.project_id);
        const rows = entry.placings.filter((placing) => !selectedDayId || placing.show_day_id === selectedDayId);
        return <div key={entry.id} className="rounded bg-neutral-800 p-2 text-sm"><p className="font-medium">{project?.name ?? entry.project_id}</p>{rows.length === 0 ? <p className="text-xs text-neutral-400">No placings for selected day.</p> : rows.map((placing) => <p key={placing.id} className="text-xs">{placing.placing} {placing.ring ? `• ${placing.ring}` : ""} {placing.notes ? `• ${placing.notes}` : ""}</p>)}</div>;
      })}</div>
    </section>
  </div>;
}
