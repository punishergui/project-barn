"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { apiClientJson, AuthStatus, Expense, Project } from "@/lib/api";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [projectId, setProjectId] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [expenseData, projectData, authData] = await Promise.all([
          apiClientJson<Expense[]>(`/expenses?project_id=${projectId}&category=${category}`),
          apiClientJson<Project[]>("/projects"),
          apiClientJson<AuthStatus>("/auth/status")
        ]);
        setExpenses(expenseData);
        setProjects(projectData);
        setAuth(authData);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };
    load().catch(() => undefined);
  }, [projectId, category]);

  const thisMonth = useMemo(() => expenses.filter((e) => new Date(e.date).getMonth() === new Date().getMonth()).reduce((acc, item) => acc + item.amount, 0), [expenses]);
  const projectTotals = useMemo(() => projects.map((p) => ({ name: p.name, total: expenses.reduce((acc, item) => acc + item.allocations.filter((a) => a.project_id === p.id).reduce((sum, a) => sum + a.amount, 0), 0) })).filter((row) => row.total > 0), [expenses, projects]);

  return <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-semibold">Expenses</h1>
      {auth?.role === "parent" && auth.is_unlocked ? <Link href="/expenses/new" className="rounded bg-red-700 px-3 py-2 text-sm">Add Expense</Link> : null}
    </div>
    <div className="grid grid-cols-2 gap-2">
      <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="rounded bg-neutral-900 p-2"><option value="">All projects</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
      <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="category" className="rounded bg-neutral-900 p-2" />
    </div>
    <div className="rounded border border-white/10 bg-neutral-900 p-3 text-sm">
      <p>This month total: ${thisMonth.toFixed(2)}</p>
      {projectTotals.map((item) => <p key={item.name}>{item.name}: ${item.total.toFixed(2)}</p>)}
    </div>
    {loading ? <p>Loading expenses...</p> : null}
    {error ? <p className="text-red-300">{error}</p> : null}
    {!loading && expenses.length === 0 ? <p className="text-neutral-400">No expenses found.</p> : null}
    <div className="space-y-2">
      {expenses.map((expense) => <Link key={expense.id} href={`/expenses/${expense.id}/edit`} title={expense.allocations.map((a) => `${projects.find((p) => p.id === a.project_id)?.name ?? a.project_id}: $${a.amount.toFixed(2)}`).join(" | ")} className="block rounded border border-white/10 bg-neutral-900 p-3 text-sm">{expense.date.slice(0, 10)} • ${expense.amount.toFixed(2)} • {expense.category} • {expense.vendor ?? "No vendor"} {expense.is_split ? <span className="ml-2 rounded bg-blue-900 px-2 py-0.5 text-xs">Split</span> : null} {expense.receipt_count > 0 ? <span className="ml-2 rounded bg-emerald-900 px-2 py-0.5 text-xs">{expense.receipt_count} receipt{expense.receipt_count === 1 ? "" : "s"}</span> : null}</Link>)}
    </div>
  </div>;
}
