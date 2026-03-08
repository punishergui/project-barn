"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AuthStatus, Profile, Project, apiClientJson } from "@/lib/api";
import { toUserErrorMessage } from "@/lib/errorMessage";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectType, setProjectType] = useState("");
  const [status, setStatus] = useState("");
  const [owner, setOwner] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const [projectData, profileData, authData] = await Promise.all([
        apiClientJson<Project[]>(`/projects?project_type=${projectType}&status=${status}&owner=${owner}`),
        apiClientJson<Profile[]>("/profiles"),
        apiClientJson<AuthStatus>("/auth/status")
      ]);
      setProjects(projectData);
      setProfiles(profileData);
      setAuth(authData);
    } catch (loadError) {
      setError(toUserErrorMessage(loadError, "Unable to load projects right now."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => undefined);
  }, [projectType, status, owner]);

  const owners = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile.name])), [profiles]);

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="mb-4 font-serif text-2xl text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground">Track livestock and non-livestock projects in one place.</p>
        </div>
        {auth?.role === "parent" && auth.is_unlocked ? (
          <Link className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium" href="/projects/new">
            Add Project
          </Link>
        ) : null}
      </div>

      <section className="rounded-2xl bg-card border border-border shadow-sm p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={projectType}
            onChange={(event) => setProjectType(event.target.value)}
            placeholder="Project type"
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <input
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            placeholder="Status"
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <select
            value={owner}
            onChange={(event) => setOwner(event.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Owner</option>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      {loading ? <p className="text-sm text-muted-foreground">Loading projects...</p> : null}

      {error ? (
        <div className="rounded-2xl bg-card border border-border shadow-sm p-4 space-y-2 text-sm">
          <p className="text-destructive">{error}</p>
          <button type="button" onClick={() => load().catch(() => undefined)} className="bg-secondary text-foreground rounded-xl px-4 py-2 text-sm">
            Retry
          </button>
        </div>
      ) : null}

      {!loading && !error && projects.length === 0 ? (
        <p className="rounded-2xl bg-card border border-border shadow-sm px-4 py-3 text-sm text-muted-foreground">No projects found for the current filters.</p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {projects.map((project) => (
          <Link key={project.id} href={`/projects/${project.id}`} className="rounded-2xl bg-card border border-border shadow-sm px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-secondary" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">{project.name}</p>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">{project.status}</span>
                </div>
                <p className="text-sm text-muted-foreground">Owner: {owners.get(project.owner_profile_id) ?? "Unknown"}</p>
                <p className="text-sm text-muted-foreground">{project.species || project.project_category || project.project_type}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
