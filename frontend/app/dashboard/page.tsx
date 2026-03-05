import { Expense, Profile, Project, Show, TimelineEntry } from "@/lib/api";
import { apiJsonServer } from "@/lib/apiServer";

import DashboardTodayClient from "./DashboardTodayClient";

export default async function DashboardPage() {
  const [projects, shows, expenses, profiles] = await Promise.all([
    apiJsonServer<Project[]>("/projects"),
    apiJsonServer<Show[]>("/shows"),
    apiJsonServer<Expense[]>("/expenses"),
    apiJsonServer<Profile[]>("/profiles")
  ]);

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  });

  const ownerMap = new Map(profiles.map((profile) => [profile.id, profile.name]));
  const projectMap = new Map(projects.map((project) => [project.id, project.name]));
  const kidsFromProfiles = profiles.filter((profile) => profile.role === "kid");
  const derivedKids = [...new Set(projects.map((project) => project.owner_profile_id))]
    .map((ownerId) => profiles.find((profile) => profile.id === ownerId))
    .filter((profile): profile is Profile => Boolean(profile));
  const kidOptions = (kidsFromProfiles.length > 0 ? kidsFromProfiles : derivedKids).map((kid) => ({
    id: kid.id,
    name: kid.name,
    avatarUrl: kid.avatar_url
  }));

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

  const recentTimeline = (
    await Promise.all(activeProjects.map((project) => apiJsonServer<TimelineEntry[]>(`/projects/${project.id}/timeline`).catch(() => [])))
  )
    .flat()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const activeAnimals = activeProjects.map((project) => {
    const nextShow = nextShowByProject.get(project.id);
    return {
      id: project.id,
      name: project.name,
      species: project.species,
      ownerId: project.owner_profile_id,
      ownerName: ownerMap.get(project.owner_profile_id) ?? "Unknown owner",
      spentTotal: expenseByProject.get(project.id) ?? 0,
      nextShowDate: nextShow?.date ?? null,
      nextShowLabel: nextShow ? `${nextShow.name} • ${new Date(nextShow.date).toLocaleDateString()}` : "None",
      photoUrl: null
    };
  });

  const recentExpenses = [...expenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <DashboardTodayClient
      todayLabel={todayLabel}
      kids={kidOptions}
      activeAnimals={activeAnimals}
      upcomingShows={upcomingShows.slice(0, 3).map((show) => ({
        id: show.id,
        name: show.name,
        startDate: show.start_date,
        location: show.location
      }))}
      recentExpenses={recentExpenses.map((expense) => ({
        id: expense.id,
        amount: expense.amount,
        category: expense.category,
        date: expense.date,
        projectName: projectMap.get(expense.project_id) ?? `Project ${expense.project_id}`
      }))}
      recentActivity={recentTimeline.map((entry) => ({
        id: entry.id,
        projectId: entry.project_id,
        title: entry.title,
        date: entry.date,
        type: entry.type
      }))}
    />
  );
}
