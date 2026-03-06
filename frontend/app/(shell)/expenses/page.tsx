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

  const thisMonth = useMemo(
    () => expenses.filter((e) => new Date(e.date).getMonth() === new Date().getMonth()).reduce((acc, item) => acc + item.amount, 0),
    [expenses]
  );

  const projectTotals = useMemo(
    () =>
      projects
        .map((p) => ({
          name: p.name,
          total: expenses.reduce(
            (acc, item) => acc + item.allocations.filter((a) => a.project_id === p.id).reduce((sum, a) => sum + a.amount, 0),
            0
          )
        }))
        .filter((row) => row.total > 0),
    [expenses, projects]
  );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 px-4 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Expenses</h1>
          <p className="text-sm text-neutral-300">Review costs, receipts, and project allocations.</p>
        </div>
        {auth?.role === "parent" && auth.is_unlocked ? (
          <Link href="/expenses/new" className="rounded-lg bg-[var(--barn-red)] px-3 py-2 text-sm font-medium text-white">
            Add Expense
          </Link>
        ) : null}
      </div>

      <section className="grid gap-2 rounded-xl border border-[var(--barn-border)] bg-[var(--barn-dark)] p-3 sm:grid-cols-2">
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="rounded-lg border border-[var(--barn-border)] bg-black/20 p-2">
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="category" className="rounded-lg border border-[var(--barn-border)] bg-black/20 p-2" />
      </section>

      <div className="rounded-xl border border-[var(--barn-border)] bg-[var(--barn-dark)] p-4 text-sm">
        <p className="font-medium">This month total: ${thisMonth.toFixed(2)}</p>
        {projectTotals.map((item) => (
          <p key={item.name} className="text-neutral-300">
            {item.name}: ${item.total.toFixed(2)}
          </p>
        ))}
      </div>

      {loading ? <p className="text-sm text-neutral-300">Loading expenses...</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {!loading && expenses.length === 0 ? (
        <div className="rounded-xl border border-[var(--barn-border)] bg-[var(--barn-dark)] p-4 text-sm text-neutral-300">
          <p>No expenses found for the current filters.</p>
          {auth?.role === "parent" && auth.is_unlocked ? <Link href="/expenses/new" className="see-all-link mt-2 inline-block">Add your first expense</Link> : null}
        </div>
      ) : null}

      <div className="space-y-2">
        {expenses.map((expense) => (
          <Link
            key={expense.id}
            href={`/expenses/${expense.id}`}
            title={expense.allocations
              .map((a) => `${projects.find((p) => p.id === a.project_id)?.name ?? a.project_id}: $${a.amount.toFixed(2)}`)
              .join(" | ")}
            className="block rounded-xl border border-[var(--barn-border)] bg-[var(--barn-dark)] p-4 text-sm"
          >
            {expense.date.slice(0, 10)} • ${expense.amount.toFixed(2)} • {expense.category} • {expense.vendor ?? "No vendor"}{" "}
            {expense.is_split ? <span className="ml-2 rounded bg-blue-900 px-2 py-0.5 text-xs">Split</span> : null}
            {expense.receipt_count > 0 ? (
              <span className="ml-2 rounded bg-emerald-900 px-2 py-0.5 text-xs">
                {expense.receipt_count} receipt{expense.receipt_count === 1 ? "" : "s"}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
