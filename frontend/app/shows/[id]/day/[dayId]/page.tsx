"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { apiClientJson, Placing, Profile, Project, Show } from "@/lib/api";

const tasks = [
  ["feed", "Feed / Water"],
  ["groom", "Grooming"],
  ["weigh", "Weigh In"],
  ["walk", "Walk / Exercise"],
  ["ring", "Ring Time"],
  ["note", "Notes"]
] as const;

export default function ShowDayModePage() {
  const params = useParams<{ id: string; dayId: string }>();
  const [show, setShow] = useState<Show | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [dayTasks, setDayTasks] = useState<any[]>([]);

  const load = async () => {
    const [showData, projectData, profileData, taskData] = await Promise.all([
      apiClientJson<Show>(`/shows/${params.id}`),
      apiClientJson<Project[]>("/projects"),
      apiClientJson<Profile[]>("/profiles"),
      apiClientJson<any[]>(`/show-days/${params.dayId}/tasks`).catch(() => [])
    ]);
    setShow(showData);
    setProjects(projectData);
    setProfiles(profileData);
    setDayTasks(taskData);
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [params.id, params.dayId]);

  const saveTask = async (projectId: number, taskKey: string, taskLabel: string, current?: any) => {
    if (current) {
      await apiClientJson(`/show-day-tasks/${current.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_completed: !current.is_completed }) });
    } else {
      await apiClientJson(`/show-days/${params.dayId}/tasks`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ project_id: projectId, task_key: taskKey, task_label: taskLabel, is_completed: true }) });
    }
    await load();
  };

  const quickPlacing = async (projectId: number) => {
    await apiClientJson("/placings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ show_id: Number(params.id), show_day_id: Number(params.dayId), project_id: projectId, class_name: "Showmanship", placing: "1", ribbon_type: "Blue" }) });
    await load();
  };

  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const profileMap = useMemo(() => new Map(profiles.map((p) => [p.id, p.name])), [profiles]);

  if (!show) return <p>Loading...</p>;

  return <div className="space-y-4 pb-4">
    <h1 className="text-xl font-semibold">Show Day Mode</h1>
    {show.entries.map((entry) => {
      const project = projectMap.get(entry.project_id);
      const owner = profileMap.get(project?.owner_profile_id ?? -1) ?? "Unknown";
      return <article key={entry.id} className="space-y-2 rounded-xl border border-white/10 bg-neutral-900 p-3">
        <div><p className="text-lg font-semibold">{project?.name ?? entry.project_id}</p><p className="text-sm text-neutral-300 capitalize">{project?.species} • {owner}</p></div>
        <div className="grid grid-cols-2 gap-2">{tasks.map(([key, label]) => {
          const row = dayTasks.find((item) => item.project_id === entry.project_id && item.task_key === key);
          return <button key={key} onClick={() => saveTask(entry.project_id, key, label, row)} className={`rounded-lg p-3 text-left text-sm ${row?.is_completed ? "bg-emerald-800" : "bg-neutral-800"}`}>{label}</button>;
        })}</div>
        <div className="flex gap-2"><button onClick={() => quickPlacing(entry.project_id)} className="rounded bg-red-700 px-3 py-2 text-sm">Quick Add Placing</button></div>
      </article>;
    })}
  </div>;
}
