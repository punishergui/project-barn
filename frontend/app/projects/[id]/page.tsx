"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { apiClientJson, AuthStatus, Expense, Project } from "@/lib/api";

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const id = Number(params.id);
        const [projectData, expenseData, authData] = await Promise.all([
          apiClientJson<Project>(`/projects/${id}`),
          apiClientJson<Expense[]>(`/expenses?project_id=${id}`),
          apiClientJson<AuthStatus>("/auth/status")
        ]);
        setProject(projectData);
        setExpenses(expenseData);
        setAuth(authData);
      } catch (e) {
        setError((e as Error).message);
      }
    };
    load().catch(() => undefined);
  }, [params.id]);

  const remove = async () => {
    if (!confirm("Delete project?")) return;
    await apiClientJson(`/projects/${params.id}`, { method: "DELETE" });
    router.push("/projects");
  };

  if (error) return <p className="text-red-300">{error}</p>;
  if (!project) return <p>Loading project...</p>;

  return <div className="space-y-4">
    <h1 className="text-2xl font-semibold">{project.name}</h1>
    <p className="text-sm text-neutral-300">{project.species} • {project.status} • {project.tag ?? "No tag"}</p>
    <p className="text-sm text-neutral-400">{project.notes ?? "No notes"}</p>
    {auth?.role === "parent" && auth.is_unlocked ? <div className="flex gap-2"><Link href={`/projects/${project.id}/edit`} className="rounded bg-neutral-800 px-3 py-2">Edit</Link><button onClick={remove} className="rounded bg-red-800 px-3 py-2">Delete</button></div> : null}
    <section className="rounded border border-white/10 bg-neutral-900 p-3">
      <h2 className="font-semibold">Expenses</h2>
      {expenses.length === 0 ? <p className="text-sm text-neutral-400">No expenses yet.</p> : expenses.map((e) => <p key={e.id} className="text-sm">{e.date.slice(0, 10)} • ${e.amount.toFixed(2)} • {e.category}</p>)}
    </section>
    <section className="rounded border border-white/10 bg-neutral-900 p-3"><h2 className="font-semibold">Shows</h2><p className="text-sm text-neutral-400">Show integration coming soon.</p></section>
  </div>;
}
