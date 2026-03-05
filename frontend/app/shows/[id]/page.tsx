"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { apiClientJson, Project, Show } from "@/lib/api";

export default function ShowDetailPage() {
  const params = useParams<{ id: string }>();
  const [show, setShow] = useState<Show | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedDayId, setSelectedDayId] = useState<number | null>(null);

  const load = async () => {
    const [showData, projectData] = await Promise.all([
      apiClientJson<Show>(`/shows/${params.id}`),
      apiClientJson<Project[]>("/projects")
    ]);
    setShow(showData);
    setProjects(projectData);
    setSelectedDayId(showData.days[0]?.id ?? null);
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [params.id]);

  const addDay = async () => {
    await apiClientJson(`/shows/${params.id}/days`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    await load();
  };

  const addEntry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await apiClientJson(`/shows/${params.id}/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: Number(form.get("project_id")),
        class_name: form.get("class_name"),
        division: form.get("division"),
        weight: form.get("weight")
      })
    });
    event.currentTarget.reset();
    await load();
  };

  const addPlacing = async (entryId: number, event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedDayId) {
      return;
    }
    const form = new FormData(event.currentTarget);
    await apiClientJson(`/entries/${entryId}/placings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        show_day_id: selectedDayId,
        ring: form.get("ring"),
        placing: form.get("placing"),
        points: form.get("points") ? Number(form.get("points")) : null,
        judge: form.get("judge")
      })
    });
    event.currentTarget.reset();
    await load();
  };

  const points = useMemo(() => show?.entries.flatMap((entry) => entry.placings).reduce((sum, placing) => sum + (placing.points ?? 0), 0) ?? 0, [show]);

  if (!show) {
    return <p>Loading...</p>;
  }

  return <div className="space-y-4">
    <div>
      <h1 className="text-2xl font-semibold">{show.name}</h1>
      <p className="text-sm text-neutral-300">{show.location} • {show.start_date.slice(0, 10)} - {show.end_date?.slice(0, 10) ?? "TBD"}</p>
      <p className="text-sm text-red-300">{points} total points</p>
      <Link href={`/shows/${show.id}/day`} className="mt-2 inline-block rounded bg-red-700 px-3 py-1 text-xs">Open Show Day Mode</Link>
    </div>

    <section className="rounded border border-white/10 bg-neutral-900 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {show.days.map((day) => <button key={day.id} onClick={() => setSelectedDayId(day.id)} className={`rounded px-3 py-1 text-sm ${selectedDayId === day.id ? "bg-red-700" : "bg-neutral-800"}`}>Day {day.day_number}</button>)}
        <button onClick={addDay} className="rounded bg-neutral-700 px-3 py-1 text-sm">Add Day</button>
      </div>
      {!show.days.length ? <p className="text-sm text-neutral-400">No show days yet.</p> : null}
    </section>

    <section className="rounded border border-white/10 bg-neutral-900 p-3">
      <h2 className="mb-2 font-semibold">Add Entry</h2>
      <form className="grid gap-2" onSubmit={addEntry}>
        <select name="project_id" className="rounded bg-neutral-800 p-2" required>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </select>
        <input name="class_name" placeholder="Class" className="rounded bg-neutral-800 p-2" />
        <input name="division" placeholder="Division" className="rounded bg-neutral-800 p-2" />
        <input name="weight" placeholder="Weight" type="number" step="0.1" className="rounded bg-neutral-800 p-2" />
        <button className="rounded bg-red-700 px-3 py-2">Save Entry</button>
      </form>
    </section>

    <section className="space-y-3">
      {show.entries.map((entry) => <article key={entry.id} className="rounded border border-white/10 bg-neutral-900 p-3">
        <p className="font-medium">Animal #{entry.project_id} • {entry.class_name ?? "Unclassified"}</p>
        <p className="text-sm text-neutral-400">{entry.division ?? "No division"} {entry.weight ? `• ${entry.weight} lbs` : ""}</p>
        <form className="mt-2 grid gap-2 sm:grid-cols-2" onSubmit={(event) => addPlacing(entry.id, event)}>
          <input name="ring" placeholder="Ring" className="rounded bg-neutral-800 p-2" />
          <input name="placing" placeholder="Placing" className="rounded bg-neutral-800 p-2" required />
          <input name="points" placeholder="Points" type="number" step="0.1" className="rounded bg-neutral-800 p-2" />
          <input name="judge" placeholder="Judge" className="rounded bg-neutral-800 p-2" />
          <button className="rounded bg-red-700 px-3 py-2 sm:col-span-2">Add Placing</button>
        </form>
        <div className="mt-2 space-y-1 text-sm">
          {entry.placings.filter((placing) => !selectedDayId || placing.show_day_id === selectedDayId).map((placing) => <p key={placing.id}>{placing.ring ? `${placing.ring} • ` : ""}{placing.placing}{placing.points ? ` (${placing.points} pts)` : ""}{placing.judge ? ` • ${placing.judge}` : ""}</p>)}
        </div>
      </article>)}
    </section>
  </div>;
}
