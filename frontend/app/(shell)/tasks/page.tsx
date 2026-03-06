"use client";

import { FormEvent, useEffect, useState } from "react";

import { apiClientJson, AuthStatus, Profile, Project, TaskItem } from "@/lib/api";

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
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Tasks</h1>

      {auth?.role === "parent" && auth.is_unlocked ? (
        <form className="grid gap-2 rounded border border-white/10 bg-neutral-900 p-3" onSubmit={createTask}>
          <input name="title" className="rounded bg-neutral-800 p-2" placeholder="Task title" required />
          <select name="project_id" className="rounded bg-neutral-800 p-2" required>
            <option value="">Select project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <select name="assigned_profile_id" className="rounded bg-neutral-800 p-2">
            <option value="">Unassigned</option>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
          <input type="date" name="due_date" className="rounded bg-neutral-800 p-2" />
          <select name="priority" className="rounded bg-neutral-800 p-2">
            <option>normal</option>
            <option>low</option>
            <option>high</option>
          </select>
          <select name="recurrence" className="rounded bg-neutral-800 p-2">
            <option>none</option>
            <option>daily</option>
            <option>weekly</option>
          </select>
          <textarea name="notes" className="rounded bg-neutral-800 p-2" placeholder="Notes" />
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          <button className="rounded bg-blue-700 px-3 py-2">Add task</button>
        </form>
      ) : null}

      {tasks.map((task) => (
        <div key={task.id} className="rounded border border-white/10 bg-neutral-900 p-3">
          <div className="flex items-center justify-between">
            <p className={task.status === "done" ? "line-through" : ""}>{task.title}</p>
            <button onClick={() => toggleTask(task.id)} className="rounded bg-neutral-700 px-2 py-1">
              {task.status === "done" ? "Undo" : "Done"}
            </button>
          </div>
          <p className="text-xs text-neutral-400">
            {task.priority} • {task.due_date ? task.due_date.slice(0, 10) : "No due date"}
          </p>
        </div>
      ))}
    </div>
  );
}
