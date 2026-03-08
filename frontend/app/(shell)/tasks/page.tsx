"use client";

import { FormEvent, useEffect, useState } from "react";

import { apiClientJson, AuthStatus, Profile, Project, TaskItem } from "@/lib/api";

const fieldClassName =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    Promise.all([
      apiClientJson<TaskItem[]>("/tasks"),
      apiClientJson<Profile[]>("/profiles"),
      apiClientJson<Project[]>("/projects"),
      apiClientJson<AuthStatus>("/auth/status")
    ]).then(([taskData, profileData, projectData, authData]) => {
      setTasks(taskData);
      setProfiles(profileData);
      setProjects(projectData);
      setAuth(authData);
    });

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  const createTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const rawProjectId = String(form.get("project_id") ?? "").trim();

    if (!rawProjectId) {
      setError("Project is required.");
      return;
    }

    try {
      await apiClientJson("/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.get("title"),
          project_id: Number(rawProjectId),
          assigned_profile_id: form.get("assigned_profile_id") ? Number(form.get("assigned_profile_id")) : null,
          due_date: form.get("due_date") || null,
          priority: form.get("priority"),
          recurrence: form.get("recurrence"),
          notes: form.get("notes")
        })
      });
      formElement.reset();
      await load();
    } catch (createError) {
      setError((createError as Error).message || "Unable to create task.");
    }
  };

  const toggleTask = async (id: number) => {
    await apiClientJson(`/tasks/${id}/toggle`, { method: "POST" });
    await load();
  };

  return (
    <div className="space-y-4 px-4 pb-4">
      <h1 className="mb-4 font-serif text-2xl text-foreground">Tasks</h1>

      {auth?.role === "parent" && auth.is_unlocked ? (
        <form className="mb-4 grid gap-2 rounded-2xl border border-border bg-card p-4" onSubmit={createTask}>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Add Task</h2>
          <input name="title" className={fieldClassName} placeholder="Task title" required />
          <select name="project_id" className={fieldClassName} required>
            <option value="">Select project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <select name="assigned_profile_id" className={fieldClassName}>
            <option value="">Unassigned</option>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
          <input type="date" name="due_date" className={fieldClassName} />
          <select name="priority" className={fieldClassName}>
            <option>normal</option>
            <option>low</option>
            <option>high</option>
          </select>
          <select name="recurrence" className={fieldClassName}>
            <option>none</option>
            <option>daily</option>
            <option>weekly</option>
          </select>
          <textarea name="notes" className={fieldClassName} placeholder="Notes" />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <button className="mt-1 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground">Add task</button>
        </form>
      ) : null}

      {tasks.map((task) => (
        <div key={task.id} className="mb-2 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => toggleTask(task.id)}
              className={task.status === "done" ? "h-5 w-5 flex-shrink-0 rounded-full border-2 border-primary bg-primary" : "h-5 w-5 flex-shrink-0 rounded-full border-2 border-border bg-background"}
              aria-label={task.status === "done" ? "Mark task open" : "Mark task done"}
            />
            <p className={task.status === "done" ? "flex-1 text-sm text-muted-foreground line-through" : "flex-1 text-sm text-foreground"}>{task.title}</p>
            <button onClick={() => toggleTask(task.id)} className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground">
              {task.status === "done" ? "Undo" : "Done"}
            </button>
          </div>
          <div className="ml-8 mt-1 flex gap-2">
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] capitalize text-muted-foreground">{task.priority}</span>
            <p className="text-xs text-muted-foreground">{task.due_date ? task.due_date.slice(0, 10) : "No due date"}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
