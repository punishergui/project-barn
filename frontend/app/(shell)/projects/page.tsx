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
    <div className="mx-auto w-full max-w-5xl space-y-5 px-4 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-neutral-300">Track livestock and non-livestock projects in one place.</p>
        </div>
        {auth?.role === "parent" && auth.is_unlocked ? (
          <Link className="rounded-lg bg-[var(--barn-red)] px-3 py-2 text-sm font-medium text-white" href="/projects/new">
            Add Project
          </Link>
        ) : null}
      </div>

      <section className="barn-card grid gap-2 sm:grid-cols-3">
        <input value={projectType} onChange={(event) => setProjectType(event.target.value)} placeholder="Project type" className="rounded-lg border border-[var(--barn-border)] bg-black/20 p-2" />
        <input value={status} onChange={(event) => setStatus(event.target.value)} placeholder="Status" className="rounded-lg border border-[var(--barn-border)] bg-black/20 p-2" />
        <select value={owner} onChange={(event) => setOwner(event.target.value)} className="rounded-lg border border-[var(--barn-border)] bg-black/20 p-2">
          <option value="">Owner</option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name}
            </option>
          ))}
        </select>
      </section>

      {loading ? <p className="text-sm text-[var(--barn-muted)]">Loading projects...</p> : null}

      {error ? (
        <div className="barn-card space-y-2 text-sm">
          <p className="text-red-200">{error}</p>
          <button type="button" onClick={() => load().catch(() => undefined)} className="rounded bg-neutral-700 px-3 py-2 text-sm">
            Retry
          </button>
        </div>
      ) : null}

      {!loading && !error && projects.length === 0 ? <p className="barn-card text-sm text-[var(--barn-muted)]">No projects found for the current filters.</p> : null}

      <div className="grid gap-3 md:grid-cols-2">
        {projects.map((project) => (
          <Link key={project.id} href={`/projects/${project.id}`} className="barn-card space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-base font-semibold">{project.name}</p>
              <span className="rounded bg-[var(--barn-bg)] px-2 py-1 text-xs">{project.status}</span>
            </div>
            <p className="text-xs text-[var(--barn-muted)]">{project.project_category ?? project.project_type}</p>
            <p className="text-xs text-[var(--barn-muted)]">Owner: {owners.get(project.owner_profile_id) ?? "Unknown"}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
