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
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 pb-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-foreground">Expenses</h1>
          <p className="text-sm text-muted-foreground">Review costs, receipts, and project allocations.</p>
        </div>
        {auth?.role === "parent" && auth.is_unlocked ? (
          <Link href="/expenses/new" className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Add Expense
          </Link>
        ) : null}
      </div>

      <div className="rounded-2xl border border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">This month</p>
          <p className="text-base font-semibold text-foreground">${thisMonth.toFixed(2)}</p>
        </div>
        <div className="mt-2 border-t border-border pt-2">
          {projectTotals.map((item) => (
            <div key={item.name} className="flex items-center justify-between py-1">
              <p className="text-sm text-foreground">{item.name}</p>
              <p className="text-sm font-medium text-foreground">${item.total.toFixed(2)}</p>
            </div>
          ))}
        </div>
      </div>

      <section className="mb-4 flex gap-2">
        <select
          value={projectId}
          onChange={(event) => setProjectId(event.target.value)}
          className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">All projects</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <input
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          placeholder="Category"
          className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </section>

      <div className="flex justify-end">
        <Link href="/expenses/categories" className="text-sm text-primary underline-offset-2 hover:underline">
          View category summary
        </Link>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading expenses...</p> : null}

      {error ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm">
          <p className="text-destructive">{error}</p>
          <button type="button" onClick={() => load().catch(() => undefined)} className="mt-2 rounded-xl bg-primary px-3 py-2 text-sm text-primary-foreground">
            Retry
          </button>
        </div>
      ) : null}

      {!loading && !error && expenses.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
          <p>No expenses found for the current filters.</p>
          {auth?.role === "parent" && auth.is_unlocked ? (
            <Link href="/expenses/new" className="mt-2 inline-block text-primary underline-offset-2 hover:underline">
              Add your first expense
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        {expenses.map((expense) => (
          <Link
            key={expense.id}
            href={`/expenses/${expense.id}`}
            title={expense.allocations
              .map((allocation) => `${projects.find((project) => project.id === allocation.project_id)?.name ?? allocation.project_id}: $${allocation.amount.toFixed(2)}`)
              .join(" | ")}
            className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3"
          >
            <div>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">{expense.category}</span>
              <p className="mt-0.5 text-sm text-foreground">{expense.vendor ?? expense.note ?? "No description"}</p>
              <p className="text-xs text-muted-foreground">{expense.date.slice(0, 10)}</p>
            </div>
            <p className="text-base font-semibold text-foreground">${expense.amount.toFixed(2)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
