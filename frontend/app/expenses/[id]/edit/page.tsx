"use client";

import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { apiClientJson, Expense, Project } from "@/lib/api";

export default function EditExpensePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    apiClientJson<Expense>(`/expenses/${params.id}`).then(setExpense).catch(() => undefined);
    apiClientJson<Project[]>("/projects").then(setProjects).catch(() => setProjects([]));
  }, [params.id]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await apiClientJson(`/expenses/${params.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())) });
    router.push("/expenses");
  };

  const remove = async () => {
    if (!confirm("Delete expense?")) return;
    await apiClientJson(`/expenses/${params.id}`, { method: "DELETE" });
    router.push("/expenses");
  };

  if (!expense) return <p>Loading expense...</p>;

  return <form onSubmit={submit} className="space-y-3 rounded-lg border border-white/10 bg-neutral-900 p-4">
    <h1 className="text-xl font-semibold">Edit Expense</h1>
    <select name="project_id" defaultValue={expense.project_id} className="w-full rounded bg-neutral-800 p-2">{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
    <input name="date" type="date" defaultValue={expense.date.slice(0, 10)} className="w-full rounded bg-neutral-800 p-2" />
    <input name="category" defaultValue={expense.category} className="w-full rounded bg-neutral-800 p-2" />
    <input name="vendor" defaultValue={expense.vendor ?? ""} className="w-full rounded bg-neutral-800 p-2" />
    <input name="amount" type="number" step="0.01" defaultValue={expense.amount} className="w-full rounded bg-neutral-800 p-2" />
    <textarea name="note" defaultValue={expense.note ?? ""} className="w-full rounded bg-neutral-800 p-2" />
    <input name="receipt_url" defaultValue={expense.receipt_url ?? ""} className="w-full rounded bg-neutral-800 p-2" />
    <div className="flex gap-2"><button className="rounded bg-red-700 px-3 py-2">Save</button><button type="button" onClick={remove} className="rounded bg-red-900 px-3 py-2">Delete</button></div>
  </form>;
}
