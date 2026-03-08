"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { apiClientJson, ProjectRecordBook } from "@/lib/api";

export default function ProjectReportPage() {
  const params = useParams<{ id: string }>();
  const [report, setReport] = useState<ProjectRecordBook | null>(null);

  useEffect(() => {
    apiClientJson<ProjectRecordBook>(`/reports/projects/${params.id}`).then(setReport).catch(() => setReport(null));
  }, [params.id]);

  if (!report) return <p className="px-4">Loading project report...</p>;

  return (
    <div className="w-full space-y-3 px-4 pb-8 print:bg-white print:text-black">
      <section className="rounded-2xl bg-card border border-border shadow-sm p-4 space-y-1 print:border-none print:bg-white">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold">Project Record Book</h1>
          <button className="rounded bg-secondary text-foreground px-2 py-1 text-xs print:hidden" onClick={() => window.print()}>Print</button>
          <a className="rounded bg-secondary text-foreground px-2 py-1 text-xs print:hidden" href={`/api/reports/projects/${params.id}.csv`}>CSV</a>
        </div>
        <p className="text-sm">{report.project.name} • Owner: {report.owner?.name ?? "Unknown"}</p>
        <p className="text-sm text-muted-foreground">{report.project.species} • Status: {report.project.status}</p>
      </section>

      <section className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
        <article className="text-sm text-muted-foreground">${report.expenses.total.toFixed(2)}<span>Expenses</span></article>
        <article className="text-sm text-muted-foreground">${report.feed.total.toFixed(2)}<span>Feed total</span></article>
        <article className="text-sm text-muted-foreground">${report.health.total.toFixed(2)}<span>Health total</span></article>
        <article className="text-sm text-muted-foreground">{report.shows.count}<span>Shows</span></article>
        <article className="text-sm text-muted-foreground">{report.placings.count}<span>Placings</span></article>
        <article className="text-sm text-muted-foreground">{report.media.count}<span>Media count</span></article>
      </section>

      <section className="rounded-2xl bg-card border border-border shadow-sm p-4">
        <h2 className="text-base font-semibold">Timeline highlights</h2>
        {report.timeline.entries.map((entry) => <p key={entry.id} className="text-sm text-muted-foreground text-sm">{entry.date} • {entry.title}</p>)}
      </section>
    </div>
  );
}
