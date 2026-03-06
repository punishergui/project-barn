"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ActivityItem, Profile, Project, apiClientJson } from "@/lib/api";

export default function ActivityPage() {
  const [rows, setRows] = useState<ActivityItem[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [profileId, setProfileId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [eventType, setEventType] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (profileId) params.set("profile_id", profileId);
    if (projectId) params.set("project_id", projectId);
    if (eventType) params.set("type", eventType);
    return params.toString();
  }, [profileId, projectId, eventType]);

  const load = async () => {
    const [activityRows, profileRows, projectRows] = await Promise.all([
      apiClientJson<ActivityItem[]>(`/activity${query ? `?${query}` : ""}`),
      apiClientJson<Profile[]>("/profiles"),
      apiClientJson<Project[]>("/projects")
    ]);
    setRows(activityRows);
    setProfiles(profileRows);
    setProjects(projectRows);
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [query]);

  return (
    <div className="w-full space-y-4 px-4 pb-6">
      <section className="barn-card space-y-2 text-sm">
        <h1 className="text-xl font-semibold">Family Activity</h1>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <select value={profileId} onChange={(e) => setProfileId(e.target.value)} className="rounded bg-[var(--barn-bg)] p-2">
            <option value="">All profiles</option>
            {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
          </select>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="rounded bg-[var(--barn-bg)] p-2">
            <option value="">All projects</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
          <input value={eventType} onChange={(e) => setEventType(e.target.value)} placeholder="Event type" className="rounded bg-[var(--barn-bg)] p-2" />
        </div>
      </section>

      {rows.length === 0 ? <p className="barn-row text-sm text-[var(--barn-muted)]">No activity found.</p> : rows.map((item) => (
        <Link href={item.route || "/dashboard"} key={item.id} className="barn-card block text-sm">
          <p className="font-semibold">{item.title}</p>
          <p className="text-xs text-[var(--barn-muted)]">{item.type} • {new Date(item.timestamp).toLocaleString()}</p>
          {item.description ? <p className="mt-1">{item.description}</p> : null}
          <p className="mt-1 text-xs text-[var(--barn-muted)]">{item.project_name || ""}{item.profile_name ? ` • ${item.profile_name}` : ""}</p>
        </Link>
      ))}
    </div>
  );
}
