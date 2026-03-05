"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { apiClientJson, Profile } from "@/lib/api";

export default function NewProjectPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { apiClientJson<Profile[]>("/profiles").then(setProfiles).catch(() => setProfiles([])); }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      const created = await apiClientJson<{ id: number }>("/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(data.entries())) });
      router.push(`/projects/${created.id}`);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return <form onSubmit={submit} className="space-y-3 rounded-lg border border-white/10 bg-neutral-900 p-4">
    <h1 className="text-xl font-semibold">New Project</h1>
    <input name="name" required placeholder="Name" className="w-full rounded bg-neutral-800 p-2" />
    <select name="species" className="w-full rounded bg-neutral-800 p-2"><option value="goat">goat</option><option value="steer">steer</option><option value="pig">pig</option><option value="other">other</option></select>
    <input name="tag" placeholder="Tag" className="w-full rounded bg-neutral-800 p-2" />
    <input name="status" placeholder="Status" defaultValue="active" className="w-full rounded bg-neutral-800 p-2" />
    <select name="owner_profile_id" required className="w-full rounded bg-neutral-800 p-2">{profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
    <textarea name="notes" placeholder="Notes" className="w-full rounded bg-neutral-800 p-2" />
    {error ? <p className="text-red-300">{error}</p> : null}
    <button className="rounded bg-red-700 px-3 py-2">Create</button>
  </form>;
}
