"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { apiClientJson, Placing, Project, Show } from "@/lib/api";

export default function ShowDetailPage() {
  const params = useParams<{ id: string }>();
  const [show, setShow] = useState<Show | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [placings, setPlacings] = useState<Placing[]>([]);

  const load = async () => {
    const [showData, projectData, placingData] = await Promise.all([
      apiClientJson<Show>(`/shows/${params.id}`),
      apiClientJson<Project[]>("/projects"),
      apiClientJson<Placing[]>(`/shows/${params.id}/placings`)
    ]);
    setShow(showData);
    setProjects(projectData);
    setPlacings(placingData);
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [params.id]);

  const addDay = async () => {
    await apiClientJson(`/shows/${params.id}/days`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label: `Day ${(show?.days.length ?? 0) + 1}` }) });
    await load();
  };

  const addPlacing = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await apiClientJson("/placings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        show_id: Number(params.id),
        project_id: Number(form.get("project_id")),
        show_day_id: form.get("show_day_id") ? Number(form.get("show_day_id")) : null,
        class_name: form.get("class_name"),
        placing: form.get("placing"),
        ribbon_type: form.get("ribbon_type"),
        notes: form.get("notes")
      })
    });
    event.currentTarget.reset();
    await load();
  };

  const attending = useMemo(() => new Set(show?.entries.map((e) => e.project_id) ?? []), [show]);
  const grouped = useMemo(() => placings.reduce<Record<string, Placing[]>>((acc, p) => {
    const key = p.class_name || "Uncategorized";
    acc[key] = acc[key] || [];
    acc[key].push(p);
    return acc;
  }, {}), [placings]);

  if (!show) return <p>Loading...</p>;

  return <div className="space-y-4 pb-4">
    <header className="rounded-xl border border-white/10 bg-neutral-900 p-4">
      <h1 className="text-2xl font-semibold">{show.name}</h1>
      <p className="text-sm text-neutral-300">{show.location} • {show.start_date.slice(0, 10)} - {show.end_date?.slice(0, 10) ?? "TBD"}</p>
      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <div className="rounded bg-neutral-800 p-2">Projects attending<br />{attending.size}</div>
        <div className="rounded bg-neutral-800 p-2">Placings<br />{placings.length}</div>
        <div className="rounded bg-neutral-800 p-2">Completion<br />{show.days.length ? Math.round((placings.length / (show.days.length * Math.max(attending.size, 1))) * 100) : 0}%</div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <Link className="rounded bg-red-700 px-3 py-2" href={`/shows/${show.id}/day/${show.days[0]?.id ?? ""}`}>Enter Show Day</Link>
        <button onClick={addDay} className="rounded bg-neutral-700 px-3 py-2">+ Add Day</button>
      </div>
    </header>

    <section className="rounded-xl border border-white/10 bg-neutral-900 p-3">
      <div className="flex flex-wrap gap-2">{show.days.map((day, i) => <Link key={day.id} href={`/shows/${show.id}/day/${day.id}`} className="rounded bg-neutral-800 px-3 py-1 text-sm">{day.label || `Day ${i + 1}`}</Link>)}</div>
    </section>

    <section className="rounded-xl border border-white/10 bg-neutral-900 p-3">
      <h2 className="mb-2 font-semibold">Add Placing</h2>
      <form className="grid gap-2 sm:grid-cols-2" onSubmit={addPlacing}>
        <select name="project_id" className="rounded bg-neutral-800 p-2" required>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <select name="show_day_id" className="rounded bg-neutral-800 p-2"><option value="">No day</option>{show.days.map((d) => <option key={d.id} value={d.id}>{d.label || `Day ${d.day_number}`}</option>)}</select>
        <input name="class_name" className="rounded bg-neutral-800 p-2" placeholder="Class name" />
        <input name="placing" className="rounded bg-neutral-800 p-2" placeholder="Placing" required />
        <input name="ribbon_type" className="rounded bg-neutral-800 p-2" placeholder="Ribbon" />
        <textarea name="notes" className="rounded bg-neutral-800 p-2 sm:col-span-2" placeholder="Notes" />
        <button className="rounded bg-red-700 px-3 py-2 sm:col-span-2">Save Placing</button>
      </form>
    </section>

    <section className="rounded-xl border border-white/10 bg-neutral-900 p-3">
      <h2 className="mb-2 font-semibold">Placings by class</h2>
      {Object.entries(grouped).map(([klass, rows]) => <div key={klass} className="mb-2 rounded bg-neutral-800 p-2 text-sm"><p className="font-medium">{klass}</p>{rows.map((row) => <p key={row.id}><span className="rounded bg-red-900 px-2 py-0.5">{row.placing}</span> {row.ribbon_type ? <span className="rounded bg-amber-800 px-2 py-0.5">{row.ribbon_type}</span> : null}</p>)}</div>)}
    </section>
  </div>;
}
