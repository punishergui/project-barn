"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiClientJson, ProjectRecordBook } from "@/lib/api";

export default function ProjectRecordBookPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<ProjectRecordBook | null>(null);
  useEffect(() => { apiClientJson<ProjectRecordBook>(`/reports/project-record-book/${params.id}`).then(setData).catch(() => undefined); }, [params.id]);

  const exportTimeline = () => {
    if (!data) return;
    const lines = ["date,type,title,description", ...data.timeline.entries.map((e) => `${e.date},${JSON.stringify(e.type)},${JSON.stringify(e.title)},${JSON.stringify(e.description || "")}`)];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `project-${params.id}-timeline.csv`; a.click(); URL.revokeObjectURL(url);
  };

  if (!data) return <p>Loading...</p>;

  return <div className="space-y-3 pb-4 print:bg-white print:text-black">
    <div className="flex gap-2"><h1 className="text-2xl font-semibold">Project Record Book</h1><button onClick={() => window.print()} className="rounded bg-neutral-700 px-3 py-2 text-sm">Print</button><button onClick={exportTimeline} className="rounded bg-red-700 px-3 py-2 text-sm">Export Timeline CSV</button></div>
    <section className="rounded bg-neutral-900 p-3 text-sm"><p className="font-semibold">{data.project.name}</p><p>Owner: {data.owner?.name ?? "Unknown"}</p><p>Species: {data.project.species}</p></section>
    <section className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4"><div className="rounded bg-neutral-900 p-3">Expenses ${data.expenses.total.toFixed(2)}</div><div className="rounded bg-neutral-900 p-3">Feed ${data.feed.total.toFixed(2)}</div><div className="rounded bg-neutral-900 p-3">Health ${data.health.total.toFixed(2)}</div><div className="rounded bg-neutral-900 p-3">Media {data.media.count}</div></section>
    <section className="rounded bg-neutral-900 p-3 text-sm">Tasks completed: {data.tasks.completed}/{data.tasks.total}</section>
    <section className="rounded bg-neutral-900 p-3 text-sm">Shows attended: {data.shows.count} • Placings: {data.placings.count} • Ribbons: {data.ribbons.count}</section>
  </div>;
}
