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
  const [species, setSpecies] = useState("");
  const [status, setStatus] = useState("");
  const [owner, setOwner] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [projectData, profileData, authData] = await Promise.all([
          apiClientJson<Project[]>(`/projects?species=${species}&status=${status}&owner=${owner}`),
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
  }, [species, status, owner]);

  const owners = useMemo(() => new Map(profiles.map((p) => [p.id, p.name])), [profiles]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projects</h1>
        {auth?.role === "parent" && auth.is_unlocked ? <Link className="rounded bg-red-700 px-3 py-2 text-sm" href="/projects/new">Add Project</Link> : null}
      </div>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <input value={species} onChange={(e) => setSpecies(e.target.value)} placeholder="species" className="rounded bg-neutral-900 p-2" />
        <input value={status} onChange={(e) => setStatus(e.target.value)} placeholder="status" className="rounded bg-neutral-900 p-2" />
        <select value={owner} onChange={(e) => setOwner(e.target.value)} className="rounded bg-neutral-900 p-2"><option value="">owner</option>{profiles.map((p) => <option value={p.id} key={p.id}>{p.name}</option>)}</select>
      </div>
      {loading ? <p>Loading projects...</p> : null}
      {error ? <p className="text-red-300">{error}</p> : null}
      {!loading && projects.length === 0 ? <p className="text-neutral-400">No projects yet.</p> : null}
      <div className="grid gap-3 md:grid-cols-2">
        {projects.map((project) => (
          <Link key={project.id} href={`/projects/${project.id}`} className="rounded-lg border border-white/10 bg-neutral-900 p-4">
            <h2 className="font-semibold">{project.name}</h2>
            <p className="text-sm text-neutral-400">{project.species} • {project.status}</p>
            <p className="text-sm text-neutral-300">Owner: {owners.get(project.owner_profile_id) ?? project.owner_profile_id}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
