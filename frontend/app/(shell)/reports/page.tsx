"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { apiClientJson, FamilySeasonSummary } from "@/lib/api";

export default function ReportsPage() {
  const [summary, setSummary] = useState<FamilySeasonSummary | null>(null);

  useEffect(() => {
    apiClientJson<FamilySeasonSummary>("/reports/family-season-summary").then(setSummary).catch(() => undefined);
  }, []);

  const byProjectSorted = useMemo(
    () => [...(summary?.by_project ?? [])].sort((a, b) => b.expenses_total_cents - a.expenses_total_cents),
    [summary]
  );

  const exportCsv = () => {
    if (!summary) return;
    const lines = [
      "project_id,project_name,owner,expenses,feed,health,shows,placings,ribbons",
      ...summary.by_project.map(
        (p) =>
          `${p.project_id},${JSON.stringify(p.project_name)},${JSON.stringify(p.owner_name)},${(p.expenses_total_cents / 100).toFixed(2)},${(p.feed_total_cents / 100).toFixed(2)},${(p.health_total_cents / 100).toFixed(2)},${p.shows_count},${p.placings_count},${p.ribbons_count}`
      )
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "family-season-summary.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full space-y-4 px-4 pb-4 print:bg-white print:text-black">
      <section className="barn-card">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">Reports</h1>
          <button onClick={() => window.print()} className="rounded bg-neutral-700 px-3 py-2 text-sm">Print</button>
          <button onClick={exportCsv} className="rounded bg-[var(--barn-red)] px-3 py-2 text-sm">Export CSV</button>
        </div>
      </section>

      {summary ? (
        <>
          <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <article className="barn-chip">${(summary.totals.expenses_total_cents / 100).toFixed(2)}<span>Expenses</span></article>
            <article className="barn-chip">${(summary.totals.feed_total_cents / 100).toFixed(2)}<span>Feed</span></article>
            <article className="barn-chip">{summary.totals.shows_count}<span>Shows</span></article>
            <article className="barn-chip">{summary.totals.placings_count}<span>Placings</span></article>
          </section>

          <section className="barn-card space-y-2">
            <h2 className="text-base font-medium">Per kid totals</h2>
            {summary.by_kid.map((kid) => (
              <article key={kid.profile_id} className="barn-row text-sm">
                {kid.profile_name} • Projects {kid.project_count} • Total ${(kid.total_cents / 100).toFixed(2)}
              </article>
            ))}
          </section>

          <section className="barn-card space-y-2">
            <h2 className="text-base font-medium">Per project totals</h2>
            {byProjectSorted.map((project) => (
              <article key={project.project_id} className="barn-row text-sm">
                <p className="font-medium">{project.project_name}</p>
                <p className="text-xs text-[var(--barn-muted)]">Owner: {project.owner_name}</p>
                <p className="text-xs text-[var(--barn-muted)]">Expenses ${(project.expenses_total_cents / 100).toFixed(2)} • Shows {project.shows_count} • Placings {project.placings_count}</p>
                <Link className="see-all-link" href={`/reports/projects/${project.project_id}`}>Project record book</Link>
              </article>
            ))}
          </section>
        </>
      ) : (
        <p className="text-sm text-[var(--barn-muted)]">Loading report summary...</p>
      )}
    </div>
  );
}
