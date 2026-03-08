import { Beef, ChevronRight, FolderOpen, Receipt, Trophy } from "lucide-react";
import Link from "next/link";

import { SectionHeader } from "@/components/section-header";
import { StatCard } from "@/components/stat-card";
import { Separator } from "@/components/ui/separator";

type DashboardProject = {
  id: number;
  name: string;
  species: string;
  project_type: string;
  project_category: string | null;
  is_livestock: boolean;
  owner: string;
  photo_url: string | null;
};
type DashboardShow = { id: number; name: string; date: string | null; location: string | null };
type DashboardExpense = { id: number; amount: number; category: string; project_name: string };

type Props = {
  todayLabel: string;
  profileName: string;
  activeProjects: DashboardProject[];
  upcomingShows: DashboardShow[];
  recentExpenses: DashboardExpense[];
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

export default function DashboardTodayClient({ todayLabel, profileName, activeProjects, upcomingShows, recentExpenses }: Props) {
  const firstName = profileName.split(" ")[0] ?? "Friend";
  const greeting = greetingForHour(new Date().getHours());

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-0.5">
        <h1 className="font-serif text-2xl text-foreground">
          {greeting}, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground">{todayLabel}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Projects" value={activeProjects.length} icon={FolderOpen} />
        <StatCard label="Animals" value={activeProjects.filter((p) => p.is_livestock).length} icon={Beef} />
        <StatCard label="Shows" value={upcomingShows.length} icon={Trophy} />
      </div>

      <div className="flex flex-col gap-3">
        <SectionHeader title="Your Animals" href="/projects" count={activeProjects.length} />
        <div className="-mx-4 overflow-x-auto px-4">
          <div className="flex gap-3 pb-2">
            {activeProjects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`} className="block w-40 flex-shrink-0">
                <div className="overflow-hidden rounded-xl border border-border bg-card">
                  <div className="relative h-28 w-full bg-secondary">
                    {project.photo_url ? (
                      <img src={project.photo_url} alt={project.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-4xl">{projectEmoji(project)}</div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute bottom-2 left-2.5 right-2.5">
                      <p className="font-serif text-sm text-white">{project.name}</p>
                      <p className="text-[11px] text-white/75">{project.owner}</p>
                    </div>
                  </div>
                  <div className="px-2.5 py-2">
                    <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">{project.species}</span>
                  </div>
                </div>
              </Link>
            ))}
            <Link href="/projects/new" className="flex h-40 w-40 flex-shrink-0 items-center justify-center rounded-xl border border-dashed border-border bg-card/50 text-muted-foreground transition-colors hover:border-primary hover:text-primary">
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl">+</span>
                <span className="text-xs">Add Project</span>
              </div>
            </Link>
          </div>
        </div>
      </div>

      <Separator />

      {upcomingShows.length > 0 ? (
        <div className="flex flex-col gap-3">
          <SectionHeader title="Upcoming Shows" href="/shows" count={upcomingShows.length} />
          <div className="flex flex-col gap-2">
            {upcomingShows.slice(0, 2).map((show) => (
              <Link key={show.id} href={`/shows/${show.id}`} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 transition-shadow hover:shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/20">
                    <Trophy className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{show.name}</p>
                    <p className="text-xs text-muted-foreground">{show.location}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs text-foreground">{show.date ? new Date(show.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "TBD"}</p>
                  <ChevronRight className="ml-auto mt-0.5 h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <Separator />

      {recentExpenses.length > 0 ? (
        <div className="flex flex-col gap-3">
          <SectionHeader title="Recent Expenses" href="/expenses" />
          <div className="rounded-xl border border-border bg-card">
            {recentExpenses.map((expense, i) => (
              <div key={expense.id}>
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                      <Receipt className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">{expense.project_name}</span>
                      <span className="text-xs capitalize text-muted-foreground">{expense.category}</span>
                    </div>
                  </div>
                  <span className="font-mono text-sm font-medium text-foreground">${expense.amount.toFixed(2)}</span>
                </div>
                {i < recentExpenses.length - 1 ? <Separator className="mx-4" /> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
