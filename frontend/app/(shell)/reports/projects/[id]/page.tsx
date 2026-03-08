"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { apiClientJson, ProjectRecordBook } from "@/lib/api";

export default function ProjectReportPage() {
  const params = useParams<{ id: string }>();
  const [report, setReport] = useState<ProjectRecordBook | null>(null);

  useEffect(() => {
    apiClientJson<ProjectRecordBook>(`/reports/projects/${params.id}`).then(setReport).catch(() => setReport(null));
  }, [params.id]);

  if (!report) {
    return <p className="px-4 text-sm text-muted-foreground">Loading project report...</p>;
  }

  return (
    <div className="w-full space-y-3 px-4 pb-8 print:bg-white print:text-black">
      <section className="space-y-1 rounded-2xl border border-border bg-card p-4 print:border-none print:bg-white">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-serif text-2xl text-foreground">Project Record Book</h1>
          <button
            className="rounded-xl bg-secondary px-2 py-1 text-xs text-foreground print:hidden"
            onClick={() => window.print()}
            type="button"
          >
            Print
          </button>
          <a
            className="rounded-xl bg-secondary px-2 py-1 text-xs text-foreground print:hidden"
            href={`/api/reports/projects/${params.id}.csv`}
          >
            CSV
          </a>
        </div>
        <p className="text-sm text-foreground">{report.project.name} • Owner: {report.owner?.name ?? "Unknown"}</p>
        <p className="text-sm text-muted-foreground">{report.project.species} • Status: {report.project.status}</p>
      </section>

      <section className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
        {[
          { label: "Expenses", value: `$${report.expenses.total.toFixed(2)}` },
          { label: "Feed total", value: `$${report.feed.total.toFixed(2)}` },
          { label: "Health total", value: `$${report.health.total.toFixed(2)}` },
          { label: "Shows", value: String(report.shows.count) },
          { label: "Placings", value: String(report.placings.count) },
          { label: "Media count", value: String(report.media.count) }
        ].map((metric) => (
          <article key={metric.label} className="rounded-2xl border border-border bg-card px-3 py-2">
            <p className="text-base font-semibold text-foreground">{metric.value}</p>
            <p className="text-xs text-muted-foreground">{metric.label}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-2 text-base font-semibold text-foreground">Timeline highlights</h2>
        {report.timeline.entries.map((entry) => (
          <p key={entry.id} className="text-sm text-muted-foreground">
            {entry.date} • {entry.title}
          </p>
        ))}
      </section>
    </div>
  );
}
