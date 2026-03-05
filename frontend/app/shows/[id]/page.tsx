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
    const [showData, projectData] = await Promise.all([apiClientJson<Show>(`/shows/${params.id}`), apiClientJson<Project[]>("/projects")]);
    setShow(showData);
    setProjects(projectData);
    setSelectedDayId(showData.days[0]?.id ?? null);
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [params.id]);

  const addDay = async () => {
    await apiClientJson(`/shows/${params.id}/days`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    await load();
  };

  const addEntry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await apiClientJson(`/shows/${params.id}/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: Number(form.get("project_id")), class_name: form.get("class_name"), division: form.get("division"), weight: form.get("weight") })
    });
    event.currentTarget.reset();
    await load();
  };

  const points = useMemo(() => show?.entries.flatMap((entry) => entry.placings).reduce((sum, placing) => sum + (placing.points ?? 0), 0) ?? 0, [show]);

  if (!show) return <p>Loading...</p>;

  return <div className="space-y-4 pb-3">
    <header className="rounded border border-white/10 bg-neutral-900 p-4">
      <h1 className="text-2xl font-semibold">{show.name}</h1>
      <p className="text-sm text-neutral-300">{show.location} • {show.start_date.slice(0, 10)} - {show.end_date?.slice(0, 10) ?? "TBD"}</p>
      <p className="text-sm text-red-300">{points} total points</p>
      <Link href={`/shows/${show.id}/day`} className="mt-3 inline-block rounded bg-red-700 px-3 py-2 text-sm">Enter Show Day Mode</Link>
    </header>

    <section className="rounded border border-white/10 bg-neutral-900 p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {show.days.map((day) => <button key={day.id} onClick={() => setSelectedDayId(day.id)} className={`rounded px-3 py-1 text-sm ${selectedDayId === day.id ? "bg-red-700" : "bg-neutral-800"}`}>Day {day.day_number}</button>)}
        <button onClick={addDay} className="rounded bg-neutral-700 px-3 py-1 text-sm">Add Day</button>
      </div>
      {!show.days.length ? <p className="text-sm text-neutral-400">No show days yet.</p> : null}
    </section>

    <section className="rounded border border-white/10 bg-neutral-900 p-3">
      <h2 className="mb-2 font-semibold">Animals attending</h2>
      {show.entries.length === 0 ? <p className="rounded bg-neutral-800 p-3 text-sm text-neutral-300">No animals entered yet.</p> : null}
      <div className="space-y-2">{show.entries.map((entry) => <p key={entry.id} className="rounded bg-neutral-800 p-2 text-sm">{projects.find((project) => project.id === entry.project_id)?.name ?? `Project ${entry.project_id}`}</p>)}</div>
    </section>

    <section className="rounded border border-white/10 bg-neutral-900 p-3">
      <h2 className="mb-2 font-semibold">Add Entry</h2>
      <form className="grid gap-2" onSubmit={addEntry}>
        <select name="project_id" className="rounded bg-neutral-800 p-2" required>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>
        <input name="class_name" placeholder="Class" className="rounded bg-neutral-800 p-2" />
        <input name="division" placeholder="Division" className="rounded bg-neutral-800 p-2" />
        <input name="weight" placeholder="Weight" className="rounded bg-neutral-800 p-2" />
        <button className="rounded bg-red-700 px-3 py-2 text-sm">Save Entry</button>
      </form>
    </section>
  </div>;
}
