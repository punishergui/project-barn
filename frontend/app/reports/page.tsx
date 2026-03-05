"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiClientJson, FamilySeasonSummary } from "@/lib/api";

export default function ReportsPage() {
  const [summary, setSummary] = useState<FamilySeasonSummary | null>(null);
  useEffect(() => { apiClientJson<FamilySeasonSummary>("/reports/family-season-summary").then(setSummary).catch(() => undefined); }, []);

  const exportCsv = () => {
    if (!summary) return;
    const lines = ["project_id,project_name,owner,expenses,feed,health,shows,placings,ribbons", ...summary.by_project.map((p) => `${p.project_id},${JSON.stringify(p.project_name)},${JSON.stringify(p.owner_name)},${(p.expenses_total_cents/100).toFixed(2)},${(p.feed_total_cents/100).toFixed(2)},${(p.health_total_cents/100).toFixed(2)},${p.shows_count},${p.placings_count},${p.ribbons_count}`)];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "family-season-summary.csv"; a.click(); URL.revokeObjectURL(url);
  };

  return <div className="space-y-4 pb-4 print:bg-white print:text-black">
    <div className="flex items-center gap-2"><h1 className="text-2xl font-semibold">Family Season Summary</h1><button onClick={() => window.print()} className="rounded bg-neutral-700 px-3 py-2 text-sm">Print</button><button onClick={exportCsv} className="rounded bg-red-700 px-3 py-2 text-sm">Export CSV</button></div>
    {summary ? <>
      <section className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-5">
        <div className="rounded bg-neutral-900 p-3">Expenses ${(summary.totals.expenses_total_cents/100).toFixed(2)}</div>
        <div className="rounded bg-neutral-900 p-3">Feed ${(summary.totals.feed_total_cents/100).toFixed(2)}</div>
        <div className="rounded bg-neutral-900 p-3">Health ${(summary.totals.health_total_cents/100).toFixed(2)}</div>
        <div className="rounded bg-neutral-900 p-3">Shows {summary.totals.shows_count}</div>
        <div className="rounded bg-neutral-900 p-3">Placings {summary.totals.placings_count}</div>
      </section>
      <section className="space-y-2"><h2 className="font-semibold">By kid</h2>{summary.by_kid.map((kid) => <article key={kid.profile_id} className="rounded bg-neutral-900 p-3 text-sm">{kid.profile_name} • Projects {kid.project_count} • Total ${(kid.total_cents/100).toFixed(2)}</article>)}</section>
      <section className="space-y-2"><h2 className="font-semibold">By project</h2>{summary.by_project.map((project) => <article key={project.project_id} className="rounded bg-neutral-900 p-3 text-sm"><p className="font-medium">{project.project_name}</p><p>Owner: {project.owner_name}</p><p>Shows {project.shows_count} • Placings {project.placings_count} • Ribbons {project.ribbons_count}</p><Link className="text-blue-300 underline" href={`/reports/projects/${project.project_id}`}>Project record book</Link></article>)}</section>
    </> : <p>Loading...</p>}
  </div>;
}
