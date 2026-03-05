"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { apiClientJson, Project } from "@/lib/api";

export default function NewExpensePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { apiClientJson<Project[]>("/projects").then(setProjects).catch(() => setProjects([])); }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const created = await apiClientJson<{ id: number }>("/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())) });
      router.push(`/expenses/${created.id}/edit`);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return <form onSubmit={submit} className="space-y-3 rounded-lg border border-white/10 bg-neutral-900 p-4">
    <h1 className="text-xl font-semibold">New Expense</h1>
    <select name="project_id" className="w-full rounded bg-neutral-800 p-2">{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
    <input name="date" type="date" required className="w-full rounded bg-neutral-800 p-2" />
    <input name="category" required placeholder="Category" className="w-full rounded bg-neutral-800 p-2" />
    <input name="vendor" placeholder="Vendor" className="w-full rounded bg-neutral-800 p-2" />
    <input name="amount" type="number" step="0.01" required placeholder="Amount" className="w-full rounded bg-neutral-800 p-2" />
    <textarea name="note" placeholder="Note" className="w-full rounded bg-neutral-800 p-2" />
    <input name="receipt_url" placeholder="Receipt URL" className="w-full rounded bg-neutral-800 p-2" />
    {error ? <p className="text-red-300">{error}</p> : null}
    <button className="rounded bg-red-700 px-3 py-2">Create</button>
  </form>;
}
