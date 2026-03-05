"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiClientJson, ReportsSummary } from "@/lib/api";

export default function ReportsPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(`${new Date().getFullYear()}-01-01`);
  const [endDate, setEndDate] = useState(today);
  const [summary, setSummary] = useState<ReportsSummary | null>(null);

  const load = async () => {
    const query = `start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`;
    setSummary(await apiClientJson<ReportsSummary>(`/reports/summary?${query}`));
  };

  useEffect(() => { load().catch(() => undefined); }, [startDate, endDate]);

  const exportCsv = () => {
    if (!summary) return;
    const headers = ["project_id", "project_name", "expenses_total", "feed_total", "health_total", "shows_count", "entries_count", "net_total"];
    const rows = summary.projects.map((row) => [row.project_id, row.project_name, row.expenses_total.toFixed(2), row.feed_total.toFixed(2), row.health_total.toFixed(2), row.shows_count, row.entries_count, row.net_total.toFixed(2)]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((x) => JSON.stringify(String(x))).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reports-summary-${startDate}-to-${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return <div className="space-y-4 pb-2"><div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">Reports</h1><button onClick={exportCsv} className="rounded bg-red-700 px-3 py-2 text-sm">Export CSV</button></div><section className="grid grid-cols-2 gap-2 rounded border border-white/10 bg-neutral-900 p-3 text-sm sm:grid-cols-4"><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="rounded bg-neutral-800 p-2" /><input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="rounded bg-neutral-800 p-2" /></section>{summary ? <section className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-5"><div className="rounded border border-white/10 bg-neutral-900 p-3">Total spent<br />${summary.overall.expenses_total.toFixed(2)}</div><div className="rounded border border-white/10 bg-neutral-900 p-3">Total feed<br />${summary.overall.feed_total.toFixed(2)}</div><div className="rounded border border-white/10 bg-neutral-900 p-3">Total health<br />${summary.overall.health_total.toFixed(2)}</div><div className="rounded border border-white/10 bg-neutral-900 p-3">Total shows<br />{summary.overall.shows_count}</div><div className="rounded border border-white/10 bg-neutral-900 p-3">Grand total<br />${summary.overall.grand_total.toFixed(2)}</div></section> : null}<section className="space-y-2">{summary?.projects.map((row) => <article key={row.project_id} className="rounded border border-white/10 bg-neutral-900 p-3 text-sm"><p className="font-semibold">{row.project_name}</p><p>Expenses: ${row.expenses_total.toFixed(2)} • Feed: ${row.feed_total.toFixed(2)} • Health: ${row.health_total.toFixed(2)}</p><p>Shows: {row.shows_count} • Net: ${row.net_total.toFixed(2)}</p><Link href={`/projects/${row.project_id}`} className="text-blue-300 underline">Open project</Link></article>)}</section></div>;
}
