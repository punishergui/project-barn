"use client";

import { useParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiClientJson, Project, Show } from "@/lib/api";

export default function ShowDetailPage() {
  const params = useParams<{ id: string }>();
  const [show, setShow] = useState<Show | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedDayId, setSelectedDayId] = useState<number | null>(null);

  const load = () => Promise.all([apiClientJson<Show>(`/shows/${params.id}`), apiClientJson<Project[]>("/projects")]).then(([showData, projectData]) => {
    setShow(showData);
    setProjects(projectData);
    setSelectedDayId(showData.days[0]?.id ?? null);
  });

  useEffect(() => { load().catch(() => undefined); }, [params.id]);

  const addDay = async () => {
    await apiClientJson(`/shows/${params.id}/days`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    await load();
  };

  const addEntry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await apiClientJson(`/shows/${params.id}/entries`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ project_id: Number(form.get("project_id")), class_name: form.get("class_name"), division: form.get("division") }) });
    (event.target as HTMLFormElement).reset();
    await load();
  };

  const addPlacing = async (entryId: number, event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await apiClientJson(`/entries/${entryId}/placings`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ show_day_id: selectedDayId, ring: form.get("ring"), placing_text: form.get("placing_text"), points: form.get("points") ? Number(form.get("points")) : null }) });
    (event.target as HTMLFormElement).reset();
    await load();
  };

  const summary = useMemo(() => {
    if (!show) return { points: 0, placings: 0 };
    const all = show.entries.flatMap((entry) => entry.placings);
    return { points: all.reduce((sum, item) => sum + (item.points ?? 0), 0), placings: all.length };
  }, [show]);

  if (!show) return <p>Loading...</p>;

  return <div className="space-y-4">
    <h1 className="text-2xl font-semibold">{show.name}</h1>
    <p className="text-sm text-neutral-300">{show.location} • {show.start_date.slice(0, 10)} - {show.end_date?.slice(0, 10) ?? "TBD"}</p>
    <p className="text-sm text-neutral-400">{summary.placings} placings • {summary.points} points</p>
    <div className="flex flex-wrap gap-2">{show.days.map((day) => <button key={day.id} onClick={() => setSelectedDayId(day.id)} className={`rounded px-3 py-1 ${selectedDayId === day.id ? "bg-blue-700" : "bg-neutral-800"}`}>{day.label}</button>)}<button onClick={addDay} className="rounded bg-neutral-700 px-3 py-1">+ Day</button></div>
    <form className="grid gap-2 rounded border border-white/10 bg-neutral-900 p-3" onSubmit={addEntry}>
      <h2 className="font-semibold">Add Entry</h2>
      <select name="project_id" className="rounded bg-neutral-800 p-2" required>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>
      <input name="class_name" placeholder="Class" className="rounded bg-neutral-800 p-2" />
      <input name="division" placeholder="Division" className="rounded bg-neutral-800 p-2" />
      <button className="rounded bg-blue-700 px-3 py-2">Save Entry</button>
    </form>
    <div className="space-y-3">{show.entries.map((entry) => <div key={entry.id} className="rounded border border-white/10 bg-neutral-900 p-3"><p className="font-medium">Project {entry.project_id} • {entry.class_name ?? "Unclassified"}</p><p className="text-sm text-neutral-400">{entry.division ?? ""}</p><form className="mt-2 grid grid-cols-3 gap-2" onSubmit={(event) => addPlacing(entry.id, event)}><input name="ring" placeholder="Ring" className="rounded bg-neutral-800 p-2" /><input name="placing_text" placeholder="Placing" className="rounded bg-neutral-800 p-2" required /><input name="points" placeholder="Points" type="number" step="0.1" className="rounded bg-neutral-800 p-2" /><button className="col-span-3 rounded bg-green-700 px-3 py-2">Add placing</button></form>{entry.placings.filter((placing) => !selectedDayId || placing.show_day_id === selectedDayId).map((placing) => <p key={placing.id} className="mt-1 text-sm">{placing.ring ? `${placing.ring} • ` : ""}{placing.placing_text} {placing.points ? `(${placing.points} pts)` : ""}</p>)}</div>)}</div>
  </div>;
}
