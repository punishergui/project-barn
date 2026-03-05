import Link from "next/link";
import { notFound } from "next/navigation";

import { apiFetch, ProjectDetail } from "@/lib/api";

type Props = { params: { id: string } };

export default async function ProjectDetailPage({ params }: Props) {
  const projectId = Number(params.id);
  if (!Number.isFinite(projectId)) {
    notFound();
  }

  let project: ProjectDetail;
  try {
    project = await apiFetch<ProjectDetail>(`/projects/${projectId}`);
  } catch {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section
        className="relative h-72 w-full bg-slate-800 bg-cover bg-center md:h-96"
        style={project.hero_image_url ? { backgroundImage: `url(${project.hero_image_url})` } : undefined}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 mx-auto max-w-6xl p-5 md:p-8">
          <p className="text-sm uppercase tracking-wide text-slate-300">{project.animal_type ?? "Project"}</p>
          <h1 className="text-3xl font-semibold md:text-4xl">{project.name}</h1>
          <p className="text-sm text-slate-300">Owner: {project.owner_profile.name}</p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
        <Link href="/projects" className="text-sm text-slate-300 underline underline-offset-4">
          Back to projects
        </Link>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <article className="rounded-2xl border border-white/10 bg-slate-900 p-4">
            <p className="text-xs text-slate-400">Total cost</p>
            <p className="mt-1 text-xl font-semibold">${project.summary.total_cost.toFixed(2)}</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-slate-900 p-4">
            <p className="text-xs text-slate-400">Expenses</p>
            <p className="mt-1 text-xl font-semibold">{project.summary.expenses_count}</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-slate-900 p-4">
            <p className="text-xs text-slate-400">Photos</p>
            <p className="mt-1 text-xl font-semibold">{project.summary.photos_count}</p>
          </article>
          <article className="rounded-2xl border border-white/10 bg-slate-900 p-4">
            <p className="text-xs text-slate-400">Shows</p>
            <p className="mt-1 text-xl font-semibold">{project.summary.shows_count}</p>
          </article>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-900 p-5">
          <h2 className="text-lg font-semibold">Recent activity</h2>
          <ul className="mt-4 space-y-3">
            {project.recent_activity.map((item) => (
              <li key={item.id} className="rounded-xl bg-slate-800/70 p-3">
                <p className="font-medium">{item.type}</p>
                <p className="text-sm text-slate-300">{item.note ?? "No note"}</p>
                <p className="text-xs text-slate-400">{item.date ? new Date(item.date).toLocaleDateString() : "No date"}</p>
              </li>
            ))}
            {project.recent_activity.length === 0 ? <li className="text-sm text-slate-400">No recent activity.</li> : null}
          </ul>
        </section>
      </div>
    </main>
  );
}
