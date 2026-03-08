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
    <div className="w-full space-y-4 pb-6">
      <section className="space-y-2">
        <h1 className="mb-4 font-serif text-2xl text-foreground">Family Activity</h1>
        <div className="flex gap-2">
          <select value={profileId} onChange={(e) => setProfileId(e.target.value)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="">All profiles</option>
            {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
          </select>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="">All projects</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
          <select value={eventType} onChange={(e) => setEventType(e.target.value)} className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="">All types</option>
            <option value="feed">Feed</option>
            <option value="weight">Weight</option>
            <option value="health">Health</option>
            <option value="note">Note</option>
          </select>
        </div>
      </section>

      {rows.length === 0 ? <p className="text-sm text-muted-foreground">No activity found.</p> : rows.map((item) => (
        <Link href={item.route || "/dashboard"} key={item.id} className="rounded-2xl bg-card border border-border shadow-sm px-4 py-3 block">
          <p className="font-semibold text-sm text-foreground">{item.title}</p>
          <p className="text-xs text-muted-foreground">{item.type} • {new Date(item.timestamp).toLocaleString()}</p>
          {item.description ? <p className="text-sm text-foreground mt-1">{item.description}</p> : null}
          <p className="mt-1 text-xs text-muted-foreground">{item.project_name || ""}{item.profile_name ? ` • ${item.profile_name}` : ""}</p>
        </Link>
      ))}
    </div>
  );
}
