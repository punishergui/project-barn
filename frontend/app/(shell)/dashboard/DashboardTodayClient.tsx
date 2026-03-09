import { Beef, FolderOpen, Trophy } from "lucide-react";
import Link from "next/link";

type DashboardProject = {
  id: number;
  name: string;
  species: string;
  project_type: string;
  project_category: string | null;
  is_livestock: boolean;
  owner: string;
  photo_url: string | null;
  open_tasks: number;
  latest_weight_lbs: number | null;
  next_show: { id: number; name: string; date: string | null } | null;
};
type DashboardShow = { id: number; name: string; date: string | null; location: string | null };
type DashboardExpense = { id: number; amount: number; category: string; project_name: string };

type Props = {
  todayLabel: string;
  profileName: string;
  activeProjects: DashboardProject[];
  upcomingShows: DashboardShow[];
  recentExpenses: DashboardExpense[];
  financeSummary: { total_spent: number; total_income: number; net_balance: number };
};

function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function projectEmoji(project: DashboardProject) {
  if (project.species === "pig") return "🐷";
  if (project.species === "goat") return "🐐";
  if (project.is_livestock) return "🐄";
  return "📋";
}

export default function DashboardTodayClient({ todayLabel, profileName, activeProjects, upcomingShows, recentExpenses, financeSummary }: Props) {
  const firstName = profileName.split(" ")[0] ?? "Friend";
  const greeting = greetingForHour(new Date().getHours());
  void recentExpenses;
  void financeSummary;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl text-foreground">
          {greeting}, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground">{todayLabel}</p>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
        <div className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5">
          <FolderOpen size={14} className="text-primary" />
          <span className="text-sm font-semibold text-foreground">{activeProjects.length}</span>
          <span className="text-xs text-muted-foreground">Projects</span>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5">
          <Beef size={14} className="text-primary" />
          <span className="text-sm font-semibold text-foreground">{activeProjects.filter((project) => project.is_livestock).length}</span>
          <span className="text-xs text-muted-foreground">Animals</span>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5">
          <Trophy size={14} className="text-primary" />
          <span className="text-sm font-semibold text-foreground">{upcomingShows.length}</span>
          <span className="text-xs text-muted-foreground">Shows</span>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your Animals & Projects</p>
          <Link href="/projects" className="text-xs font-medium text-primary">
            See all
          </Link>
        </div>

        <div className="-mx-4 px-4">
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {activeProjects.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">No projects yet. Add one to get started!</p>
            ) : (
              activeProjects.map((project) => (
                <Link key={project.id} href={`/projects/${project.id}`} className="block w-40 flex-shrink-0">
                  <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                    <div className="relative h-28 w-full bg-secondary">
                      {project.photo_url ? (
                        <img src={project.photo_url} alt={project.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-3xl">{projectEmoji(project)}</div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-2 left-2.5 right-2.5">
                        <p className="font-serif text-sm leading-tight text-white">{project.name}</p>
                        <p className="text-[11px] text-white/75">{project.owner}</p>
                      </div>
                    </div>
                    <div className="px-2.5 py-2">
                      {project.open_tasks > 0 ? (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">{project.open_tasks} tasks</span>
                      ) : project.latest_weight_lbs ? (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">{project.latest_weight_lbs} lbs</span>
                      ) : (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] capitalize text-muted-foreground">{project.species}</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {upcomingShows.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Upcoming Shows</p>
          <div className="flex flex-col gap-2">
            {upcomingShows.map((show) => (
              <Link key={show.id} href={`/shows/${show.id}`} className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-foreground">{show.name}</p>
                  <p className="text-xs text-muted-foreground">{show.date ? formatDate(show.date) : "TBD"}</p>
                </div>
                <Trophy size={14} className="text-primary" />
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
