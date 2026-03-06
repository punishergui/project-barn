import { Expense, MediaItem, Profile, Project, SessionResponse, Show, TimelineEntry } from "@/lib/api";
import { apiJsonServer } from "@/lib/apiServer";

import DashboardTodayClient from "./DashboardTodayClient";

type ActivityItem = {
  id: string;
  title: string;
  type: string;
  date: string;
  href: string;
};

export default async function DashboardPage() {
  const [projects, shows, expenses, profiles, session, media] = await Promise.all([
    apiJsonServer<Project[]>("/projects"),
    apiJsonServer<Show[]>("/shows"),
    apiJsonServer<Expense[]>("/expenses"),
    apiJsonServer<Profile[]>("/profiles"),
    apiJsonServer<SessionResponse>("/session").catch(() => ({ active_profile: null, family: { id: null, name: null } })),
    apiJsonServer<MediaItem[]>("/media").catch(() => [])
  ]);

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  });

  const ownerMap = new Map(profiles.map((profile) => [profile.id, profile.name]));
  const projectMap = new Map(projects.map((project) => [project.id, project.name]));
  const activeProjects = projects.filter((project) => project.status === "active");

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const upcomingShows = [...shows]
    .filter((show) => new Date(show.start_date).getTime() >= now.getTime())
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

  const expenseByProject = new Map<number, number>();
  expenses.forEach((expense) => {
    const rows = expense.allocations.length > 0 ? expense.allocations : [{ project_id: expense.project_id, amount: expense.amount }];
    rows.forEach((allocation) => {
      expenseByProject.set(allocation.project_id, (expenseByProject.get(allocation.project_id) ?? 0) + allocation.amount);
    });
  });

  const nextShowByProject = new Map<number, { date: string; name: string }>();
  upcomingShows.forEach((show) => {
    show.entries.forEach((entry) => {
      if (!nextShowByProject.has(entry.project_id)) {
        nextShowByProject.set(entry.project_id, { date: show.start_date, name: show.name });
      }
    });
  });

  const timelineRows = (
    await Promise.all(activeProjects.map((project) => apiJsonServer<TimelineEntry[]>(`/projects/${project.id}/timeline`).catch(() => [])))
  ).flat();

  const timelineActivity: ActivityItem[] = timelineRows.map((entry) => ({
    id: `timeline-${entry.id}`,
    title: entry.title,
    type: entry.type,
    date: entry.date,
    href: `/projects/${entry.project_id}?tab=timeline`
  }));

  const expenseActivity: ActivityItem[] = expenses.map((expense) => ({
    id: `expense-${expense.id}`,
    title: `Expense added: ${expense.category}`,
    type: "expense",
    date: expense.date,
    href: `/expenses/${expense.id}`
  }));

  const placingActivity: ActivityItem[] = shows.flatMap((show) =>
    show.entries.flatMap((entry) =>
      entry.placings.map((placing) => ({
        id: `placing-${placing.id}`,
        title: `Placing added for ${projectMap.get(entry.project_id) ?? `Project ${entry.project_id}`}`,
        type: "placing",
        date: placing.placed_at ?? placing.created_at ?? show.start_date,
        href: `/shows/${show.id}`
      }))
    )
  );

  const mediaActivity: ActivityItem[] = media.map((item) => ({
    id: `media-${item.id}`,
    title: `Media added: ${item.caption?.trim() || item.file_name}`,
    type: "media",
    date: item.created_at || new Date().toISOString(),
    href: item.project_id ? `/projects/${item.project_id}?tab=media` : "/projects"
  }));

  const recentActivity = [...timelineActivity, ...expenseActivity, ...placingActivity, ...mediaActivity]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  const activeAnimals = activeProjects.map((project) => {
    const nextShow = nextShowByProject.get(project.id);
    return {
      id: project.id,
      name: project.name,
      species: project.species,
      ownerName: ownerMap.get(project.owner_profile_id) ?? "Unknown owner",
      spentTotal: expenseByProject.get(project.id) ?? 0,
      nextShowLabel: nextShow ? `${nextShow.name} • ${new Date(nextShow.date).toLocaleDateString()}` : "No show scheduled"
    };
  });

  const recentExpenses = [...expenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <DashboardTodayClient
      todayLabel={todayLabel}
      profileName={session.active_profile?.name ?? "Barn Family"}
      quickStats={{ projects: activeProjects.length, upcomingShows: upcomingShows.length, expenses: recentExpenses.length }}
      activeProjects={activeAnimals}
      upcomingShows={upcomingShows.slice(0, 3).map((show) => ({
        id: show.id,
        name: show.name,
        startDate: show.start_date,
        location: show.location,
        entryCount: show.entries.length
      }))}
      recentExpenses={recentExpenses.map((expense) => ({
        id: expense.id,
        amount: expense.amount,
        category: expense.category,
        date: expense.date,
        projectName: projectMap.get(expense.project_id) ?? `Project ${expense.project_id}`,
        allocationCount: expense.allocation_count || 1
      }))}
      recentActivity={recentActivity}
      quickActions={[
        { href: "/projects/new", label: "Add Project" },
        { href: "/expenses/new", label: "Add Expense" },
        { href: "/shows", label: "View Shows" },
        { href: "/profile-picker", label: "Switch Profile" }
      ]}
    />
  );
}
