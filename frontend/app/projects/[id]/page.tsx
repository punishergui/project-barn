"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { apiClientJson, AuthStatus, Expense, MediaItem, Project, Show, TaskItem } from "@/lib/api";

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const id = Number(params.id);
    const [projectData, expenseData, authData, taskData, showData, mediaData] = await Promise.all([
      apiClientJson<Project>(`/projects/${id}`),
      apiClientJson<Expense[]>(`/expenses?project_id=${id}`),
      apiClientJson<AuthStatus>("/auth/status"),
      apiClientJson<TaskItem[]>(`/projects/${id}/tasks`),
      apiClientJson<Show[]>(`/projects/${id}/shows`),
      apiClientJson<MediaItem[]>(`/media?project_id=${id}`)
    ]);
    setProject(projectData);
    setExpenses(expenseData);
    setAuth(authData);
    setTasks(taskData);
    setShows(showData);
    setMedia(mediaData);
  };

  useEffect(() => {
    load().catch((e) => setError((e as Error).message));
  }, [params.id]);

  const remove = async () => {
    if (!confirm("Delete project?")) return;
    await apiClientJson(`/projects/${params.id}`, { method: "DELETE" });
    router.push("/projects");
  };

  const addTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await apiClientJson("/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: form.get("title"), due_date: form.get("due_date"), project_id: Number(params.id) }) });
    (event.target as HTMLFormElement).reset();
    await load();
  };

  const upload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    form.set("project_id", String(params.id));
    await apiClientJson("/media/upload", { method: "POST", body: form });
    (event.target as HTMLFormElement).reset();
    await load();
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
    <section className="rounded border border-white/10 bg-neutral-900 p-3"><h2 className="font-semibold">Shows</h2>{shows.map((show) => <p key={show.id} className="text-sm">{show.name} • {show.entries.filter((entry) => entry.project_id === project.id).length} entries</p>)}</section>
    <section className="rounded border border-white/10 bg-neutral-900 p-3"><h2 className="font-semibold">Tasks</h2>{auth?.role === "parent" && auth.is_unlocked ? <form className="mb-2 grid gap-2" onSubmit={addTask}><input name="title" className="rounded bg-neutral-800 p-2" placeholder="Task title" required /><input name="due_date" type="date" className="rounded bg-neutral-800 p-2" /><button className="rounded bg-blue-700 px-3 py-2">Add Task</button></form> : null}{tasks.map((task) => <p key={task.id} className={`text-sm ${task.due_date && task.status === "open" && task.due_date.slice(0, 10) < new Date().toISOString().slice(0, 10) ? "text-orange-300" : ""}`}>{task.title} • {task.status}</p>)}</section>
    <section className="rounded border border-white/10 bg-neutral-900 p-3"><h2 className="font-semibold">Gallery</h2><form className="mb-2 grid gap-2" onSubmit={upload}><input name="file" type="file" className="rounded bg-neutral-800 p-2" required /><input name="caption" className="rounded bg-neutral-800 p-2" placeholder="Caption" /><button className="rounded bg-blue-700 px-3 py-2" disabled={!(auth?.role === "parent" && auth.is_unlocked)}>Upload</button></form><div className="grid grid-cols-2 gap-2">{media.map((item) => <div key={item.id} className="rounded bg-neutral-800 p-2"><img src={item.url} alt={item.caption ?? item.filename} className="h-28 w-full rounded object-cover" /><p className="text-xs text-neutral-300">{item.caption ?? item.filename}</p></div>)}</div></section>
  </div>;
}
