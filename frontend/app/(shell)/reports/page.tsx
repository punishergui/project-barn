"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { FamilyFinancialSummary, FamilySummaryExtra, apiClientJson } from "@/lib/api";
import { toUserErrorMessage } from "@/lib/errorMessage";

export default function ReportsPage() {
  const [summary, setSummary] = useState<FamilyFinancialSummary | null>(null);
  const [familySummary, setFamilySummary] = useState<FamilySummaryExtra | null>(null);
  const [range, setRange] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
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
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="font-serif text-2xl text-foreground">Reports</h1>
          <div className="flex gap-2">
            <button type="button" onClick={() => window.print()} className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground">
              Print
            </button>
            <a className="rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground" href="/api/reports/family-summary.csv">
              Family CSV
            </a>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3">
          <select
            value={range}
            onChange={(event) => setRange(event.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value="all">All time</option>
            <option value="this_year">This year</option>
            <option value="custom">Custom range</option>
          </select>
          {range === "custom" ? (
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          ) : null}
          {range === "custom" ? (
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          ) : null}
          {range === "custom" ? (
            <button type="button" onClick={() => load().catch(() => undefined)} className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              Apply dates
            </button>
          ) : null}
        </div>
      </section>

      {loading ? <p className="text-sm text-muted-foreground">Loading report summary...</p> : null}

      {error ? (
        <section className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm">
          <p className="text-destructive">{error}</p>
          <button type="button" onClick={() => load().catch(() => undefined)} className="mt-2 rounded-xl bg-primary px-3 py-2 text-sm text-primary-foreground">
            Retry
          </button>
        </section>
      ) : null}

      {summary && !error ? (
        <>
          <section className="mb-4 grid grid-cols-3 gap-3">
            <article className="flex flex-col items-center rounded-2xl border border-border bg-card px-2 py-3">
              <p className="text-base font-semibold text-foreground">${summary.overall_totals.total_expenses.toFixed(2)}</p>
              <span className="mt-0.5 text-[10px] text-muted-foreground">Total expenses</span>
            </article>
            <article className="flex flex-col items-center rounded-2xl border border-border bg-card px-2 py-3">
              <p className="text-base font-semibold text-foreground">${summary.overall_totals.total_income.toFixed(2)}</p>
              <span className="mt-0.5 text-[10px] text-muted-foreground">Total income</span>
            </article>
            <article className="flex flex-col items-center rounded-2xl border border-border bg-card px-2 py-3">
              <p className="text-base font-semibold text-foreground">${summary.overall_totals.net_family_balance.toFixed(2)}</p>
              <span className="mt-0.5 text-[10px] text-muted-foreground">Net family balance</span>
            </article>
          </section>

          <section className="mb-4 flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3">
            <p className="text-sm text-muted-foreground">Checklist completion</p>
            <p className="text-sm font-medium text-foreground">
              {familySummary?.checklists?.completed ?? 0} / {familySummary?.checklists?.total ?? 0} ({familySummary?.checklists?.completion_percent ?? 0}%)
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Project breakdown</h2>
            {sortedProjects.map((project) => {
              const net = project.net_profit_loss;
              return (
                <article key={project.project_id} className="mb-2 flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
                  <p className="text-sm font-medium text-foreground">{project.project_name}</p>
                  <div className="flex gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Spent</p>
                      <p className="text-sm font-medium text-foreground">${project.total_expenses.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Income</p>
                      <p className="text-sm font-medium text-green-600">${project.total_income.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Net</p>
                      <p className={`text-sm font-semibold ${net >= 0 ? "text-green-600" : "text-red-500"}`}>${net.toFixed(2)}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>

          <section className="rounded-2xl border border-border bg-card p-4">
            <h2 className="mb-2 text-sm font-medium text-foreground">By member/profile</h2>
            {summary.by_member.map((member) => (
              <article key={member.profile_id} className="py-1 text-sm text-muted-foreground">
                <p className="text-sm font-medium text-foreground">{member.member_name}</p>
                <p>
                  Expenses ${member.total_project_expenses.toFixed(2)} • Income ${member.total_project_income.toFixed(2)} • Net ${member.net_total.toFixed(2)}
                </p>
              </article>
            ))}
          </section>

          <div className="flex gap-2">
            <Link className="text-sm text-primary underline-offset-2 hover:underline" href="/reports/projects">
              Project records
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
