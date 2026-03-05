"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { apiClientJson, Expense, Project } from "@/lib/api";

export default function ExpenseDetailPage() {
  const params = useParams<{ id: string }>();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    Promise.all([
      apiClientJson<Expense>(`/expenses/${params.id}`),
      apiClientJson<Project[]>("/projects")
    ]).then(([expenseData, projectData]) => {
      setExpense(expenseData);
      setProjects(projectData);
    }).catch(() => undefined);
  }, [params.id]);

  const projectNames = useMemo(() => new Map(projects.map((project) => [project.id, project.name])), [projects]);

  if (!expense) {
    return <p>Loading expense...</p>;
  }

  return (
    <div className="space-y-4 rounded-lg border border-white/10 bg-neutral-900 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Expense Detail</h1>
        <Link href={`/expenses/${expense.id}/edit`} className="rounded bg-red-700 px-3 py-2 text-sm">Edit</Link>
      </div>

      <section className="rounded bg-neutral-800 p-3 text-sm">
        <p className="font-semibold">${expense.amount.toFixed(2)}</p>
        <p>{expense.category}</p>
        <p>{expense.vendor ?? "No vendor"}</p>
        <p>{expense.date.slice(0, 10)}</p>
        <p className="text-neutral-300">{expense.note ?? "No note"}</p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Allocations</h2>
        {expense.allocations.map((allocation) => (
          <div key={`${allocation.project_id}-${allocation.id ?? "row"}`} className="rounded bg-neutral-800 p-3 text-sm">
            <p>{projectNames.get(allocation.project_id) ?? `Project ${allocation.project_id}`}</p>
            <p>${allocation.amount.toFixed(2)} ({expense.amount > 0 ? ((allocation.amount / expense.amount) * 100).toFixed(1) : "0.0"}%)</p>
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Receipts</h2>
        {expense.receipts.length === 0 ? <p className="rounded bg-neutral-800 p-3 text-sm text-neutral-300">No receipts attached.</p> : null}
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {expense.receipts.map((receipt) => (
            <a key={receipt.id} href={receipt.url} target="_blank" className="rounded bg-neutral-800 p-2" rel="noreferrer">
              <img src={receipt.url} alt={receipt.caption ?? receipt.file_name} className="h-24 w-full rounded object-cover" />
              <p className="mt-1 text-xs text-neutral-300">{receipt.caption ?? receipt.file_name}</p>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
