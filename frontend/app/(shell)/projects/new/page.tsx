"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { apiClientJson, Profile } from "@/lib/api";

const projectTypes = [
  { value: "livestock", label: "Livestock" },
  { value: "cooking", label: "Cooking / Baking" },
  { value: "crafts", label: "Crafts / Art" },
  { value: "woodworking", label: "Woodworking / Shop" },
  { value: "gardening", label: "Gardening / Plants" },
  { value: "photography", label: "Photography / Media" },
  { value: "sewing", label: "Sewing / Fashion" },
  { value: "other", label: "Other" }
] as const;

export default function NewProjectPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [projectType, setProjectType] = useState<(typeof projectTypes)[number]["value"]>("livestock");

  useEffect(() => {
    apiClientJson<Profile[]>("/profiles")
      .then(setProfiles)
      .catch(() => setProfiles([]));
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      const created = await apiClientJson<{ id: number }>("/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...Object.fromEntries(data.entries()), project_type: projectType })
      });
      router.push(`/projects/${created.id}`);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-white/10 bg-neutral-900 p-4">
      <h1 className="text-xl font-semibold">New Project</h1>

      <section className="space-y-2">
        <label className="text-sm text-[var(--barn-muted)]">Project name</label>
        <input name="name" required placeholder="Name" className="w-full rounded bg-neutral-800 p-2" />
      </section>

      <section className="space-y-2">
        <label className="text-sm text-[var(--barn-muted)]">Project type</label>
        <div className="grid grid-cols-2 gap-2">
          {projectTypes.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setProjectType(item.value)}
              className={`min-h-11 rounded border px-2 py-2 text-xs ${projectType === item.value ? "border-[var(--barn-red)] bg-[var(--barn-red)]/20" : "border-[var(--barn-border)] bg-neutral-800"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {projectType === "livestock" ? (
        <section className="grid gap-2 sm:grid-cols-2">
          <input name="breed" placeholder="Breed" className="rounded bg-neutral-800 p-2" />
          <select name="sex" className="rounded bg-neutral-800 p-2">
            <option value="">Sex</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="castrated">Castrated</option>
          </select>
          <input name="tag" placeholder="Ear tag" className="rounded bg-neutral-800 p-2" />
          <input name="target_weight" type="number" step="0.1" placeholder="Target weight (lbs)" className="rounded bg-neutral-800 p-2" />
          <div>
            <label className="mb-1 block text-xs text-[var(--barn-muted)]">Purchase date</label>
            <input name="purchase_date" type="date" className="w-full rounded bg-neutral-800 p-2" />
          </div>
        </section>
      ) : (
        <section className="grid gap-2">
          <input name="project_category" placeholder="Project category" className="rounded bg-neutral-800 p-2" />
          <input name="competition_category" placeholder="Competition or display category" className="rounded bg-neutral-800 p-2" />
          <textarea name="materials_needed" placeholder="Materials needed" className="rounded bg-neutral-800 p-2" />
          <textarea name="goal" placeholder="Project goal" className="rounded bg-neutral-800 p-2" />
          <div>
            <label className="mb-1 block text-xs text-[var(--barn-muted)]">Completion target date</label>
            <input name="completion_target_date" type="date" className="w-full rounded bg-neutral-800 p-2" />
          </div>
        </section>
      )}

      <input name="status" placeholder="Status" defaultValue="active" className="w-full rounded bg-neutral-800 p-2" />
      <select name="owner_profile_id" required className="w-full rounded bg-neutral-800 p-2">
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <textarea name="notes" placeholder="Notes" className="w-full rounded bg-neutral-800 p-2" />
      {error ? <p className="text-red-300">{error}</p> : null}
      <button className="rounded bg-red-700 px-3 py-2">Create</button>
    </form>
  );
}
