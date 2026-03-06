"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { apiClientJson, AuthStatus, Profile, Project } from "@/lib/api";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectType, setProjectType] = useState("");
  const [status, setStatus] = useState("");
  const [owner, setOwner] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [projectData, profileData, authData] = await Promise.all([
          apiClientJson<Project[]>(`/projects?project_type=${projectType}&status=${status}&owner=${owner}`),
          apiClientJson<Profile[]>("/profiles"),
          apiClientJson<AuthStatus>("/auth/status")
        ]);
        setProjects(projectData);
        setProfiles(profileData);
        setAuth(authData);
        setError(null);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };
    load().catch(() => undefined);
  }, [projectType, status, owner]);

  const owners = useMemo(() => new Map(profiles.map((p) => [p.id, p.name])), [profiles]);

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
        <input value={projectType} onChange={(e) => setProjectType(e.target.value)} placeholder="project type" className="rounded-lg border border-[var(--barn-border)] bg-black/20 p-2" />
        <input value={status} onChange={(e) => setStatus(e.target.value)} placeholder="status" className="rounded-lg border border-[var(--barn-border)] bg-black/20 p-2" />
        <select value={owner} onChange={(e) => setOwner(e.target.value)} className="rounded-lg border border-[var(--barn-border)] bg-black/20 p-2">
          <option value="">owner</option>
          {profiles.map((p) => (
            <option value={p.id} key={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </section>

      {loading ? <p className="text-sm text-neutral-300">Loading projects...</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {!loading && projects.length === 0 ? <p className="rounded-xl border border-[var(--barn-border)] bg-[var(--barn-bg)] p-4 text-sm text-neutral-300">No projects yet.</p> : null}
      <div className="grid gap-3 md:grid-cols-2">
        {projects.map((project) => (
          <Link key={project.id} href={`/projects/${project.id}`} className="rounded-xl border border-[var(--barn-border)] bg-[var(--barn-bg)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">{project.name}</h2>
                <p className="text-sm capitalize text-neutral-300">
                  {project.project_category || project.project_type} • {project.status}
                </p>
                <p className="text-sm text-neutral-300">Owner: {owners.get(project.owner_profile_id) ?? project.owner_profile_id}</p>
              </div>
              {project.photo_url ? <img src={project.photo_url} alt={project.name} className="h-14 w-14 rounded-lg object-cover" /> : null}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
