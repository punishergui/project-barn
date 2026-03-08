"use client";

import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { apiClientJson, Profile, Project } from "@/lib/api";

const projectTypes = ["livestock", "cooking", "crafts", "woodworking", "gardening", "photography", "sewing", "other"] as const;

export default function EditProjectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [projectType, setProjectType] = useState<(typeof projectTypes)[number]>("livestock");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClientJson<Project>(`/projects/${params.id}`)
      .then((data) => {
        setProject(data);
        setProjectType((data.project_type as (typeof projectTypes)[number]) || "other");
      })
      .catch((e) => setError((e as Error).message));
    apiClientJson<Profile[]>("/profiles").then(setProfiles).catch(() => setProfiles([]));
  }, [params.id]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    await apiClientJson(`/projects/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, project_type: projectType })
    });
    router.push(`/projects/${params.id}`);
  };

  if (error) return <p className="text-red-300">{error}</p>;
  if (!project) return <p>Loading...</p>;

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-border bg-background p-4">
      <h1 className="text-xl font-semibold">Edit Project</h1>
      <input name="name" defaultValue={project.name} className="w-full rounded bg-background p-2" />

      <div className="grid grid-cols-2 gap-2">
        {projectTypes.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setProjectType(item)}
            className={`min-h-11 rounded border px-2 py-2 text-xs capitalize ${projectType === item ? "border-primary bg-primary/20" : "border-border bg-background"}`}
          >
            {item}
          </button>
        ))}
      </div>

      {projectType === "livestock" ? (
        <section className="grid gap-2 sm:grid-cols-2">
          <input name="breed" defaultValue={project.breed ?? ""} placeholder="Breed" className="rounded bg-background p-2" />
          <input name="sex" defaultValue={project.sex ?? ""} placeholder="Sex" className="rounded bg-background p-2" />
          <input name="tag" defaultValue={project.ear_tag ?? ""} placeholder="Ear tag" className="rounded bg-background p-2" />
          <input name="target_weight" defaultValue={project.target_weight ?? ""} type="number" step="0.1" placeholder="Target weight" className="rounded bg-background p-2" />
          <input name="purchase_date" defaultValue={project.purchase_date ?? ""} type="date" className="rounded bg-background p-2" />
        </section>
      ) : (
        <section className="grid gap-2">
          <input name="project_category" defaultValue={project.project_category ?? ""} placeholder="Project category" className="rounded bg-background p-2" />
          <input name="competition_category" defaultValue={project.competition_category ?? ""} placeholder="Competition category" className="rounded bg-background p-2" />
          <textarea name="materials_needed" defaultValue={project.materials_needed ?? ""} placeholder="Materials needed" className="rounded bg-background p-2" />
          <textarea name="goal" defaultValue={project.goal ?? ""} placeholder="Goal" className="rounded bg-background p-2" />
          <input name="completion_target_date" defaultValue={project.completion_target_date ?? ""} type="date" className="rounded bg-background p-2" />
        </section>
      )}

      <input name="status" defaultValue={project.status} className="w-full rounded bg-background p-2" />
      <select name="owner_profile_id" defaultValue={project.owner_profile_id} className="w-full rounded bg-background p-2">
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <textarea name="notes" defaultValue={project.notes ?? ""} className="w-full rounded bg-background p-2" />
      <button className="rounded bg-red-700 px-3 py-2">Save</button>
    </form>
  );
}
