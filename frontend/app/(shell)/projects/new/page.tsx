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
    <form onSubmit={submit} className="space-y-4 pb-4">
      <div>
        <h1 className="mb-4 font-serif text-2xl text-foreground">New Project</h1>
        <p className="text-sm text-muted-foreground">Create a new project profile and assign an owner.</p>
      </div>

      <section className="rounded-2xl bg-card border border-border shadow-sm p-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Project Type</p>
        <div className="grid grid-cols-2 gap-2">
          {projectTypes.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setProjectType(item.value)}
              className={projectType === item.value ? "bg-primary text-primary-foreground rounded-xl py-2 text-sm" : "bg-secondary text-foreground rounded-xl py-2 text-sm"}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-card border border-border shadow-sm p-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Basics</p>
        <label className="text-sm text-muted-foreground">Project name</label>
        <input name="name" required placeholder="Name" className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30" />
        <input name="status" placeholder="Status" defaultValue="active" className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30" />
        <select name="owner_profile_id" required className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30">
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </section>

      {projectType === "livestock" ? (
        <section className="rounded-2xl bg-card border border-border shadow-sm p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Livestock Details</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <input name="breed" placeholder="Breed" className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <select name="sex" className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">Sex</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="castrated">Castrated</option>
            </select>
            <input name="tag" placeholder="Ear tag" className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <input name="target_weight" type="number" step="0.1" placeholder="Target weight (lbs)" className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm text-muted-foreground">Purchase date</label>
              <input name="purchase_date" type="date" className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl bg-card border border-border shadow-sm p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Project Details</p>
          <input name="project_category" placeholder="Project category" className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <input name="competition_category" placeholder="Competition or display category" className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <textarea name="materials_needed" placeholder="Materials needed" className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <textarea name="goal" placeholder="Project goal" className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30" />
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">Completion target date</label>
            <input name="completion_target_date" type="date" className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </section>
      )}

      <section className="rounded-2xl bg-card border border-border shadow-sm p-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Notes</p>
        <textarea name="notes" placeholder="Notes" className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <button className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold">Create Project</button>
    </form>
  );
}
