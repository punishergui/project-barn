"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AuthStatus, Expense, Project, apiClientJson } from "@/lib/api";
import { toUserErrorMessage } from "@/lib/errorMessage";

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [projectId, setProjectId] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const [expenseData, projectData, authData] = await Promise.all([
        apiClientJson<Expense[]>(`/expenses?project_id=${projectId}&category=${category}`),
        apiClientJson<Project[]>("/projects"),
        apiClientJson<AuthStatus>("/auth/status")
      ]);
      setExpenses(expenseData);
      setProjects(projectData);
      setAuth(authData);
    } catch (loadError) {
      setError(toUserErrorMessage(loadError, "Unable to load expenses right now."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [projectId, category]);

  const thisMonth = useMemo(
    () => expenses.filter((entry) => new Date(entry.date).getMonth() === new Date().getMonth()).reduce((acc, item) => acc + item.amount, 0),
    [expenses]
  );

  const projectTotals = useMemo(
    () =>
      projects
        .map((project) => ({
          name: project.name,
          total: expenses.reduce(
            (acc, item) => acc + item.allocations.filter((allocation) => allocation.project_id === project.id).reduce((sum, allocation) => sum + allocation.amount, 0),
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
        <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="rounded-lg border border-[var(--barn-border)] bg-black/20 p-2">
          <option value="">All projects</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Category" className="rounded-lg border border-[var(--barn-border)] bg-black/20 p-2" />
      </section>

      <div className="flex justify-end">
        <Link href="/expenses/categories" className="see-all-link text-sm">
          View category summary
        </Link>
      </div>

      <div className="rounded-xl border border-[var(--barn-border)] bg-[var(--barn-dark)] p-4 text-sm">
        <p className="font-medium">This month total: ${thisMonth.toFixed(2)}</p>
        {projectTotals.map((item) => (
          <p key={item.name} className="text-neutral-300">
            {item.name}: ${item.total.toFixed(2)}
          </p>
        ))}
      </div>

      {loading ? <p className="text-sm text-neutral-300">Loading expenses...</p> : null}

      {error ? (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
          <p>{error}</p>
          <button type="button" onClick={() => load().catch(() => undefined)} className="mt-2 rounded bg-neutral-700 px-3 py-2 text-sm">
            Retry
          </button>
        </div>
      ) : null}

      {!loading && !error && expenses.length === 0 ? (
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
              .map((allocation) => `${projects.find((project) => project.id === allocation.project_id)?.name ?? allocation.project_id}: $${allocation.amount.toFixed(2)}`)
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
