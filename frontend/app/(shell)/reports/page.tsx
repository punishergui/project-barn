"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { FamilyFinancialSummary, apiClientJson } from "@/lib/api";
import { toUserErrorMessage } from "@/lib/errorMessage";

type FamilySummaryExtra = {
  checklists?: { total: number; completed: number; completion_percent: number };
  project_type_distribution?: Record<string, number>;
};

export default function ReportsPage() {
  const [range, setRange] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [summary, setSummary] = useState<FamilyFinancialSummary | null>(null);
  const [familySummary, setFamilySummary] = useState<FamilySummaryExtra | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("range", range);
    if (range === "custom") {
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);
    }
    const query = params.toString();

    try {
      const [financialData, familyData] = await Promise.all([
        apiClientJson<FamilyFinancialSummary>(`/reports/financial-summary${query ? `?${query}` : ""}`),
        apiClientJson<FamilySummaryExtra>("/reports/family-summary")
      ]);
      setSummary(financialData);
      setFamilySummary(familyData);
    } catch (loadError) {
      setError(toUserErrorMessage(loadError, "Unable to load reports right now."));
      setSummary(null);
      setFamilySummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [range]);

  const sortedProjects = useMemo(
    () => [...(summary?.by_project ?? [])].sort((a, b) => b.net_profit_loss_cents - a.net_profit_loss_cents),
    [summary]
  );

  return (
    <div className="w-full space-y-4 px-4 pb-4">
      <section className="barn-card space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">Reports</h1>
          <button type="button" onClick={() => window.print()} className="rounded bg-neutral-700 px-3 py-2 text-sm">Print</button>
          <a className="rounded bg-[var(--barn-red)] px-3 py-2 text-sm" href="/api/reports/family-summary.csv">Family CSV</a>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <select value={range} onChange={(event) => setRange(event.target.value)} className="rounded border border-[var(--barn-border)] bg-black/20 p-2 text-sm">
            <option value="all">All time</option>
            <option value="this_year">This year</option>
            <option value="custom">Custom range</option>
          </select>
          {range === "custom" ? <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="rounded border border-[var(--barn-border)] bg-black/20 p-2 text-sm" /> : null}
          {range === "custom" ? <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="rounded border border-[var(--barn-border)] bg-black/20 p-2 text-sm" /> : null}
        </div>
        {range === "custom" ? <button type="button" onClick={() => load().catch(() => undefined)} className="rounded bg-neutral-700 px-3 py-2 text-sm">Apply dates</button> : null}
      </section>

      {loading ? <p className="text-sm text-[var(--barn-muted)]">Loading report summary...</p> : null}

      {error ? (
        <section className="barn-card space-y-2 text-sm">
          <p className="text-red-200">{error}</p>
          <button type="button" onClick={() => load().catch(() => undefined)} className="rounded bg-neutral-700 px-3 py-2 text-sm">Retry</button>
        </section>
      ) : null}

      {summary && !error ? (
        <>
          <section className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <article className="barn-chip">${summary.overall_totals.total_expenses.toFixed(2)}<span>Total expenses</span></article>
            <article className="barn-chip">${summary.overall_totals.total_income.toFixed(2)}<span>Total income</span></article>
            <article className="barn-chip">${summary.overall_totals.net_family_balance.toFixed(2)}<span>Net family balance</span></article>
          </section>

          <section className="barn-card space-y-2">
            <h2 className="text-base font-medium">Family summary polish</h2>
            <p className="text-sm text-[var(--barn-muted)]">Checklist completion: {familySummary?.checklists?.completed ?? 0} / {familySummary?.checklists?.total ?? 0} ({familySummary?.checklists?.completion_percent ?? 0}%)</p>
            <div className="flex flex-wrap gap-2 text-xs">
              {Object.entries(familySummary?.project_type_distribution ?? {}).map(([projectType, count]) => <span key={projectType} className="rounded bg-neutral-800 px-2 py-1">{projectType}: {count}</span>)}
            </div>
          </section>

          <section className="barn-card space-y-2">
            <h2 className="text-base font-medium">By project</h2>
            {sortedProjects.map((project) => (
              <article key={project.project_id} className="barn-row text-sm">
                <p className="font-medium">{project.project_name}</p>
                <p className="text-xs text-[var(--barn-muted)]">Owner: {project.owner_name ?? "Unknown"}</p>
                <p className="text-xs text-[var(--barn-muted)]">Expenses ${project.total_expenses.toFixed(2)} • Materials ${(project.total_materials ?? 0).toFixed(2)} • Income ${project.total_income.toFixed(2)} • Net ${project.net_profit_loss.toFixed(2)}</p>
                <div className="flex gap-2">
                  <Link className="see-all-link" href={`/reports/projects/${project.project_id}`}>Project record</Link>
                  <a className="see-all-link" href={`/api/reports/projects/${project.project_id}.csv`}>CSV</a>
                </div>
              </article>
            ))}
          </section>

          <section className="barn-card space-y-2">
            <h2 className="text-base font-medium">By member/profile</h2>
            {summary.by_member.map((member) => (
              <article key={member.profile_id} className="barn-row text-sm">
                <p className="font-medium">{member.member_name}</p>
                <p className="text-xs text-[var(--barn-muted)]">Expenses ${member.total_project_expenses.toFixed(2)} • Income ${member.total_project_income.toFixed(2)} • Net ${member.net_total.toFixed(2)}</p>
              </article>
            ))}
          </section>
        </>
      ) : null}
    </div>
  );
}
