"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChangeEvent, useEffect, useMemo, useState } from "react";

import { Expense, Project, apiClientJson } from "@/lib/api";
import { toUserErrorMessage } from "@/lib/errorMessage";
import { uploadReceipt } from "@/lib/uploads";

function isPdf(url: string) {
  return /\.pdf($|\?)/i.test(url);
}

export default function ExpenseDetailPage() {
  const params = useParams<{ id: string }>();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [expenseData, projectData] = await Promise.all([
        apiClientJson<Expense>(`/expenses/${params.id}`),
        apiClientJson<Project[]>("/projects")
      ]);
      setExpense(expenseData);
      setProjects(projectData);
    } catch (loadError) {
      setError(toUserErrorMessage(loadError, "Unable to load this expense."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [params.id]);

  const onUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await uploadReceipt(Number(params.id), file);
      await load();
      setError(null);
    } catch (uploadError) {
      setError(toUserErrorMessage(uploadError, "Unable to upload receipt."));
    } finally {
      event.target.value = "";
    }
  };

  const projectNames = useMemo(() => new Map(projects.map((project) => [project.id, project.name])), [projects]);

  if (loading) {
    return <p className="text-sm text-neutral-300">Loading expense...</p>;
  }

  if (!expense) {
    return <div className="space-y-2"><p className="text-sm text-red-200">{error ?? "Expense not found."}</p><button type="button" className="rounded bg-neutral-700 px-3 py-2 text-sm" onClick={() => load().catch(() => undefined)}>Retry</button></div>;
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
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">Receipts</h2>
          <label className="cursor-pointer rounded bg-red-700 px-3 py-2 text-xs">
            Upload receipt
            <input type="file" accept="image/*,.pdf,application/pdf" className="hidden" onChange={(event) => onUpload(event).catch(() => undefined)} />
          </label>
        </div>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        {expense.receipts.length === 0 ? <p className="rounded bg-neutral-800 p-3 text-sm text-neutral-300">No receipts attached.</p> : null}
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {expense.receipts.map((receipt) => (
            <div key={receipt.id} className="rounded bg-neutral-800 p-2">
              {isPdf(receipt.url) ? (
                <a href={receipt.url} className="block rounded border border-white/20 p-4 text-center text-xs text-blue-200 underline">View PDF receipt</a>
              ) : (
                <a href={receipt.url}>
                  <img src={receipt.url} alt={receipt.caption ?? receipt.file_name} className="h-24 w-full rounded object-cover" />
                </a>
              )}
              <p className="mt-1 text-xs text-neutral-300">{receipt.caption ?? receipt.file_name}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
