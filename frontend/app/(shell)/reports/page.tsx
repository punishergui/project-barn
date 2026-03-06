"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { apiClientJson, FamilyFinancialSummary } from "@/lib/api";

export default function ReportsPage() {
  const [range, setRange] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [summary, setSummary] = useState<FamilyFinancialSummary | null>(null);

  const load = async () => {
    const params = new URLSearchParams();
    params.set("range", range);
    if (range === "custom") {
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);
    }
    const query = params.toString();
    const data = await apiClientJson<FamilyFinancialSummary>(`/reports/financial-summary${query ? `?${query}` : ""}`);
    setSummary(data);
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [range]);

  const sortedProjects = useMemo(() => [...(summary?.by_project ?? [])].sort((a, b) => b.net_profit_loss_cents - a.net_profit_loss_cents), [summary]);

  return (
    <div className="w-full space-y-4 px-4 pb-4">
      <section className="barn-card space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">Reports</h1>
          <button onClick={() => window.print()} className="rounded bg-neutral-700 px-3 py-2 text-sm">Print</button>
          <a className="rounded bg-[var(--barn-red)] px-3 py-2 text-sm" href="/api/reports/financial-summary.csv">Export CSV</a>
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
        {range === "custom" ? <button onClick={() => load().catch(() => undefined)} className="rounded bg-neutral-700 px-3 py-2 text-sm">Apply dates</button> : null}
      </section>

      {summary ? (
        <>
          <section className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <article className="barn-chip">${summary.overall_totals.total_expenses.toFixed(2)}<span>Total expenses</span></article>
            <article className="barn-chip">${summary.overall_totals.total_income.toFixed(2)}<span>Total income</span></article>
            <article className="barn-chip">${summary.overall_totals.net_family_balance.toFixed(2)}<span>Net family balance</span></article>
          </section>

          <section className="barn-card space-y-2">
            <h2 className="text-base font-medium">By project</h2>
            {sortedProjects.map((project) => (
              <article key={project.project_id} className="barn-row text-sm">
                <p className="font-medium">{project.project_name}</p>
                <p className="text-xs text-[var(--barn-muted)]">Owner: {project.owner_name ?? "Unknown"}</p>
                <p className="text-xs text-[var(--barn-muted)]">Expenses ${project.total_expenses.toFixed(2)} • Materials ${(project.total_materials ?? 0).toFixed(2)} • Income ${project.total_income.toFixed(2)} • Net ${project.net_profit_loss.toFixed(2)}</p>
                <Link className="see-all-link" href={`/reports/projects/${project.project_id}`}>Project record book</Link>
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

          <section className="barn-card space-y-2">
            <h2 className="text-base font-medium">Recent sales / auction outcomes</h2>
            {summary.recent_sales.length === 0 ? <p className="barn-row text-sm text-[var(--barn-muted)]">No sales found in selected range.</p> : null}
            {summary.recent_sales.map((sale) => (
              <article key={sale.id} className="barn-row text-sm">
                <p className="font-medium">{sale.buyer_name}</p>
                <p className="text-xs text-[var(--barn-muted)]">{new Date(sale.sale_date).toLocaleDateString()} • Gross ${sale.sale_amount.toFixed(2)} • Net ${sale.final_payout.toFixed(2)}</p>
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
