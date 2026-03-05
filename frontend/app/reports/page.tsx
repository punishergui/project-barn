"use client";

import { useEffect, useMemo, useState } from "react";

import { apiClientJson, Expense, Profile, Project } from "@/lib/api";

type ReportRow = {
  date: string;
  vendor: string;
  category: string;
  amount: number;
  allocated_project: string;
  allocated_amount: number;
  kid: string;
  has_receipt: boolean;
  receipt_count: number;
  notes: string;
  receipt_links: string[];
};

export default function ReportsPage() {
  const today = new Date();
  const [startDate, setStartDate] = useState(`${today.getFullYear()}-01-01`);
  const [endDate, setEndDate] = useState(today.toISOString().slice(0, 10));
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedKid, setSelectedKid] = useState("");
  const [category, setCategory] = useState("");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    Promise.all([
      apiClientJson<Expense[]>(`/expenses?start_date=${startDate}&end_date=${endDate}`),
      apiClientJson<Project[]>("/projects"),
      apiClientJson<Profile[]>("/profiles")
    ]).then(([expenseData, projectData, profileData]) => {
      setExpenses(expenseData);
      setProjects(projectData);
      setProfiles(profileData);
    }).catch(() => undefined);
  }, [startDate, endDate]);

  const projectMap = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const kidMap = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile.name])), [profiles]);

  const rows = useMemo(() => {
    const built: ReportRow[] = [];
    expenses.forEach((expense) => {
      const allocations = expense.allocations.length > 0 ? expense.allocations : [{ project_id: expense.project_id, amount: expense.amount }];
      allocations.forEach((allocation) => {
        const project = projectMap.get(allocation.project_id);
        const kidName = kidMap.get(project?.owner_profile_id ?? -1) ?? "Unknown";
        built.push({
          date: expense.date.slice(0, 10),
          vendor: expense.vendor ?? "",
          category: expense.category,
          amount: expense.amount,
          allocated_project: project?.name ?? `Project ${allocation.project_id}`,
          allocated_amount: allocation.amount,
          kid: kidName,
          has_receipt: expense.receipt_count > 0,
          receipt_count: expense.receipt_count,
          notes: expense.note ?? "",
          receipt_links: expense.receipts.map((receipt) => receipt.url)
        });
      });
    });

    return built.filter((row) => {
      if (selectedProject && row.allocated_project !== projectMap.get(Number(selectedProject))?.name) return false;
      if (selectedKid && row.kid !== kidMap.get(Number(selectedKid))) return false;
      if (category && row.category !== category) return false;
      return true;
    });
  }, [expenses, projectMap, kidMap, selectedProject, selectedKid, category]);

  const summaryByProject = useMemo(() => Object.entries(rows.reduce<Record<string, number>>((acc, row) => ({ ...acc, [row.allocated_project]: (acc[row.allocated_project] ?? 0) + row.allocated_amount }), {})), [rows]);
  const summaryByKid = useMemo(() => Object.entries(rows.reduce<Record<string, number>>((acc, row) => ({ ...acc, [row.kid]: (acc[row.kid] ?? 0) + row.allocated_amount }), {})), [rows]);
  const summaryByCategory = useMemo(() => Object.entries(rows.reduce<Record<string, number>>((acc, row) => ({ ...acc, [row.category]: (acc[row.category] ?? 0) + row.allocated_amount }), {})), [rows]);

  const coverage = rows.length ? (rows.filter((row) => row.has_receipt).length / rows.length) * 100 : 0;

  const exportCsv = () => {
    const headers = ["date", "vendor", "category", "amount", "allocated_project", "allocated_amount", "kid", "has_receipt", "receipt_count", "notes"];
    const csvRows = [headers.join(","), ...rows.map((row) => headers.map((header) => JSON.stringify(String(row[header as keyof ReportRow] ?? ""))).join(","))];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tax-report-${startDate}-to-${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return <div className="space-y-4 pb-2">
    <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">Tax Reports</h1><button onClick={exportCsv} className="rounded bg-red-700 px-3 py-2 text-sm">Export CSV</button></div>

    <section className="grid grid-cols-2 gap-2 rounded border border-white/10 bg-neutral-900 p-3 text-sm sm:grid-cols-5">
      <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="rounded bg-neutral-800 p-2" />
      <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="rounded bg-neutral-800 p-2" />
      <select value={selectedProject} onChange={(event) => setSelectedProject(event.target.value)} className="rounded bg-neutral-800 p-2"><option value="">All projects</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>
      <select value={selectedKid} onChange={(event) => setSelectedKid(event.target.value)} className="rounded bg-neutral-800 p-2"><option value="">All kids</option>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select>
      <input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Category" className="rounded bg-neutral-800 p-2" />
    </section>

    <section className="rounded border border-white/10 bg-neutral-900 p-3 text-sm">
      <p className="font-semibold">Receipt coverage: {coverage.toFixed(1)}%</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <div><p className="mb-1 text-xs uppercase text-neutral-400">By Project</p>{summaryByProject.map(([name, total]) => <p key={name} className="text-xs">{name}: ${total.toFixed(2)}</p>)}</div>
        <div><p className="mb-1 text-xs uppercase text-neutral-400">By Kid</p>{summaryByKid.map(([name, total]) => <p key={name} className="text-xs">{name}: ${total.toFixed(2)}</p>)}</div>
        <div><p className="mb-1 text-xs uppercase text-neutral-400">By Category</p>{summaryByCategory.map(([name, total]) => <p key={name} className="text-xs">{name}: ${total.toFixed(2)}</p>)}</div>
      </div>
    </section>

    <section className="space-y-2">
      {rows.length === 0 ? <p className="rounded bg-neutral-900 p-3 text-sm text-neutral-300">No report rows for selected filters.</p> : null}
      {rows.filter((row) => !row.has_receipt).length > 0 ? <div className="rounded border border-amber-700/40 bg-amber-900/20 p-3 text-xs text-amber-100">Missing receipts: {rows.filter((row) => !row.has_receipt).length}</div> : null}
      <div className="space-y-2">{rows.map((row, index) => <article key={`${row.date}-${row.allocated_project}-${index}`} className="rounded border border-white/10 bg-neutral-900 p-3 text-xs"><p>{row.date} • {row.vendor || "Unknown vendor"} • {row.category}</p><p>${row.allocated_amount.toFixed(2)} to {row.allocated_project} ({row.kid})</p><p>{row.has_receipt ? `Receipts: ${row.receipt_count}` : "Missing receipt"}</p><div className="flex flex-wrap gap-2">{row.receipt_links.map((url) => <a key={url} href={url} target="_blank" className="text-blue-300 underline" rel="noreferrer">Open receipt</a>)}</div></article>)}</div>
    </section>
  </div>;
}
