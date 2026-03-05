import Link from "next/link";

import { apiFetch, ProjectListItem } from "@/lib/api";

export default async function ProjectsPage() {
  const projects = await apiFetch<ProjectListItem[]>("/projects");

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-slate-100 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold">Projects</h1>
          <Link href="/dashboard" className="text-sm text-slate-300 underline underline-offset-4">
            Back to dashboard
          </Link>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900 transition hover:border-emerald-400"
            >
              <div
                className="h-40 w-full bg-slate-800 bg-cover bg-center"
                style={project.hero_image_url ? { backgroundImage: `url(${project.hero_image_url})` } : undefined}
              />
              <div className="space-y-2 p-4">
                <h2 className="text-xl font-semibold">{project.name}</h2>
                <p className="text-sm text-slate-400">Owner: {project.owner_profile.name}</p>
                <div className="flex justify-between text-sm text-slate-300">
                  <span>${project.total_cost.toFixed(2)} spent</span>
                  <span>{project.ribbon_count} ribbons</span>
                </div>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
