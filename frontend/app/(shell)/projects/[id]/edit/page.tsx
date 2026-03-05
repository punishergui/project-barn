"use client";

import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { apiClientJson, Profile, Project } from "@/lib/api";

export default function EditProjectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClientJson<Project>(`/projects/${params.id}`).then(setProject).catch((e) => setError((e as Error).message));
    apiClientJson<Profile[]>("/profiles").then(setProfiles).catch(() => setProfiles([]));
  }, [params.id]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    await apiClientJson(`/projects/${params.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    router.push(`/projects/${params.id}`);
  };

  if (error) return <p className="text-red-300">{error}</p>;
  if (!project) return <p>Loading...</p>;

  return <form onSubmit={submit} className="space-y-3 rounded-lg border border-white/10 bg-neutral-900 p-4">
    <h1 className="text-xl font-semibold">Edit Project</h1>
    <input name="name" defaultValue={project.name} className="w-full rounded bg-neutral-800 p-2" />
    <select name="species" defaultValue={project.species} className="w-full rounded bg-neutral-800 p-2"><option value="goat">goat</option><option value="steer">steer</option><option value="pig">pig</option><option value="other">other</option></select>
    <input name="tag" defaultValue={project.tag ?? ""} className="w-full rounded bg-neutral-800 p-2" />
    <input name="status" defaultValue={project.status} className="w-full rounded bg-neutral-800 p-2" />
    <select name="owner_profile_id" defaultValue={project.owner_profile_id} className="w-full rounded bg-neutral-800 p-2">{profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
    <textarea name="notes" defaultValue={project.notes ?? ""} className="w-full rounded bg-neutral-800 p-2" />
    <button className="rounded bg-red-700 px-3 py-2">Save</button>
  </form>;
}
