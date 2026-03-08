"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useMemo, useState } from "react";

import { AuthStatus, Expense, Project, apiClientJson } from "@/lib/api";
import { toUserErrorMessage } from "@/lib/errorMessage";
import { uploadReceipt } from "@/lib/uploads";

function isPdf(url: string) {
  return /\.pdf($|\?)/i.test(url);
}

export default function ExpenseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [expenseData, projectData, authData] = await Promise.all([
        apiClientJson<Expense>(`/expenses/${params.id}`),
        apiClientJson<Project[]>("/projects"),
        apiClientJson<AuthStatus>("/auth/status").catch(() => null)
      ]);
      setExpense(expenseData);
      setProjects(projectData);
      setAuth(authData);
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

  const removeReceipt = async (receiptId: number) => {
    try {
      await apiClientJson(`/receipts/${receiptId}`, { method: "DELETE" });
      await load();
    } catch (deleteError) {
      setError(toUserErrorMessage(deleteError, "Unable to delete this receipt."));
    }
  };

  const deleteExpense = async () => {
    if (!expense || !window.confirm("Delete this expense? This can be restored from backups only.")) {
      return;
    }

    try {
      await apiClientJson(`/expenses/${expense.id}`, { method: "DELETE" });
      router.push("/expenses");
      router.refresh();
    } catch (deleteError) {
      setError(toUserErrorMessage(deleteError, "Unable to delete this expense."));
    }
  };

  const projectNames = useMemo(() => new Map(projects.map((project) => [project.id, project.name])), [projects]);

  if (loading) {
    return <p className="px-4 text-sm text-muted-foreground">Loading expense...</p>;
  }

  if (!expense) {
    return <div className="space-y-2 px-4"><p className="text-sm text-foreground">{error ?? "Expense not found."}</p><button type="button" className="rounded bg-secondary text-foreground px-3 py-2 text-sm" onClick={() => load().catch(() => undefined)}>Retry</button></div>;
  }

  const canManage = auth?.role === "parent" && auth.is_unlocked;

  return (
    <div className="space-y-4 px-4 pb-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Expense Detail</h1>
        <div className="flex gap-2">
          <Link href={`/expenses/${expense.id}/edit`} className="rounded bg-primary text-primary-foreground px-3 py-2 text-sm">Edit</Link>
          {canManage ? <button type="button" onClick={() => deleteExpense().catch(() => undefined)} className="rounded bg-primary text-primary-foreground px-3 py-2 text-sm">Delete</button> : null}
        </div>
      </div>

      <section className="rounded bg-background p-3 text-sm">
        <p className="font-semibold">${expense.amount.toFixed(2)}</p>
        <p>{expense.category}</p>
        <p>{expense.vendor ?? "No vendor"}</p>
        <p>{expense.date.slice(0, 10)}</p>
        <p className="text-muted-foreground">{expense.note ?? "No note"}</p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Allocations</h2>
        {expense.allocations.map((allocation) => (
          <div key={`${allocation.project_id}-${allocation.id ?? "row"}`} className="rounded bg-background p-3 text-sm">
            <p>{projectNames.get(allocation.project_id) ?? `Project ${allocation.project_id}`}</p>
            <p>${allocation.amount.toFixed(2)} ({expense.amount > 0 ? ((allocation.amount / expense.amount) * 100).toFixed(1) : "0.0"}%)</p>
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">Receipts</h2>
          {canManage ? (
            <label className="cursor-pointer rounded bg-primary text-primary-foreground px-3 py-2 text-xs">
              Upload receipt
              <input type="file" accept="image/*,.pdf,application/pdf" className="hidden" onChange={(event) => onUpload(event).catch(() => undefined)} />
            </label>
          ) : null}
        </div>
        {error ? <p className="text-sm text-foreground">{error}</p> : null}
        {expense.receipts.length === 0 ? <p className="rounded bg-background p-3 text-sm text-muted-foreground">No receipts attached.</p> : null}
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {expense.receipts.map((receipt) => (
            <div key={receipt.id} className="rounded bg-background p-2">
              {isPdf(receipt.url) ? (
                <a href={receipt.url} className="block rounded border border-border p-4 text-center text-xs text-primary underline">View PDF receipt</a>
              ) : (
                <a href={receipt.url}>
                  <img src={receipt.url} alt={receipt.caption ?? receipt.file_name} className="h-24 w-full rounded object-cover" />
                </a>
              )}
              <p className="mt-1 text-xs text-muted-foreground">{receipt.caption ?? receipt.file_name}</p>
              {canManage ? <button type="button" onClick={() => removeReceipt(receipt.id).catch(() => undefined)} className="mt-1 text-xs text-primary underline">Delete receipt</button> : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
