"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { ProjectTask, apiClientJson } from "@/lib/api";

export default function ProjectTasksPage() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);

  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setError(null);
    setLoading(true);

    try {
      const response = await apiClientJson<ProjectTask[]>(`/projects/${projectId}/tasks`);
      setTasks(response);
    } catch {
      setError("Unable to load tasks right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [projectId]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    setSaving(true);
    setError(null);

    try {
      await apiClientJson(`/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.get("title"),
          due_date: form.get("due_date") || null,
          is_daily: form.get("is_daily") === "on"
        })
      });
      event.currentTarget.reset();
      await load();
    } catch {
      setError("Unable to add task right now.");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (task: ProjectTask) => {
    setError(null);

    try {
      await apiClientJson(`/projects/${projectId}/tasks/${task.id}/${task.is_completed ? "uncomplete" : "complete"}`, {
        method: "POST"
      });
      await load();
    } catch {
      setError("Unable to update task right now.");
    }
  };

  const daily = useMemo(() => tasks.filter((task) => task.is_daily), [tasks]);
  const due = useMemo(() => tasks.filter((task) => !task.is_daily), [tasks]);

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">Project Tasks</h1>

      <form onSubmit={submit} className="grid gap-2 rounded border border-border bg-background p-3">
        <input name="title" required placeholder="Task title" className="rounded bg-background p-2" />
        <input name="due_date" type="date" className="rounded bg-background p-2" />
        <label className="text-sm">
          <input type="checkbox" name="is_daily" className="mr-2" />
          Daily task
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-primary text-primary-foreground px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Add task"}
        </button>
      </form>

      {error ? <p className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading tasks...</p>
      ) : (
        <>
          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase text-muted-foreground">Today (Daily)</h2>
            {daily.length === 0 ? <p className="text-sm text-muted-foreground">No daily tasks yet.</p> : null}
            {daily.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => toggle(task)}
                className="block w-full rounded border border-border bg-background p-3 text-left text-sm"
              >
                <span className={task.is_completed ? "line-through" : ""}>{task.title}</span>
              </button>
            ))}
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase text-muted-foreground">Due tasks</h2>
            {due.length === 0 ? <p className="text-sm text-muted-foreground">No due-date tasks yet.</p> : null}
            {due.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => toggle(task)}
                className="block w-full rounded border border-border bg-background p-3 text-left text-sm"
              >
                <span className={task.is_completed ? "line-through" : ""}>{task.title}</span>
                <span className="ml-2 text-xs text-muted-foreground">{task.due_date?.slice(0, 10) ?? "No due date"}</span>
              </button>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
