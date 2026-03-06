import { apiJsonServer } from "@/lib/apiServer";

import DashboardTodayClient from "./DashboardTodayClient";

type DashboardResponse = {
  active_profile: { id: number | null; name: string | null; role: string | null; avatar_url: string | null };
  family_name: string | null;
  active_projects: Array<{
    id: number;
    name: string;
    species: string;
    project_type: string;
    project_category: string | null;
    is_livestock: boolean;
    owner: string;
    status: string;
    photo_url: string | null;
    spent_total: number;
    open_tasks: number;
    latest_weight_lbs: number | null;
    next_show: { id: number; name: string; date: string | null } | null;
    next_event: string | null;
  }>;
  upcoming_shows: Array<{ id: number; name: string; date: string | null; location: string | null }>;
  recent_expenses: Array<{ id: number; amount: number; date: string | null; category: string; vendor: string | null; has_receipt: boolean; project_name: string }>;
  recent_activity: Array<{ id: string; kind: string; title: string; subtitle: string; date: string; href: string }>;
  low_feed_inventory: Array<{ id: number; name: string; qty_on_hand: number; unit: string; low_stock_threshold: number | null }>;
  recent_feed_events: Array<{ id: number; project_id: number; project_name: string; recorded_at: string | null; feed_type: string; amount: number; unit: string }>;
  finance_summary: { total_spent: number; total_income: number; net_balance: number; recent_sale: { id: number; buyer_name: string; sale_date: string; final_payout: number } | null };
  unread_notifications: number;
  upcoming_reminders: Array<{ id: number; project_id: number; project_name: string; type: string; time_of_day: string | null; notes: string | null; parent_locked: boolean; route: string }>;
};

const emptyDashboard: DashboardResponse = {
  active_profile: { id: null, name: null, role: null, avatar_url: null },
  family_name: null,
  active_projects: [],
  upcoming_shows: [],
  recent_expenses: [],
  recent_activity: [],
  low_feed_inventory: [],
  recent_feed_events: [],
  finance_summary: { total_spent: 0, total_income: 0, net_balance: 0, recent_sale: null },
  unread_notifications: 0,
  upcoming_reminders: []
};

export default async function DashboardPage() {
  let hasLoadError = false;
  const dashboard = await apiJsonServer<DashboardResponse>("/dashboard").catch(() => {
    hasLoadError = true;
    return emptyDashboard;
  });

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  });

  return (
    <DashboardTodayClient
      todayLabel={todayLabel}
      profileName={dashboard.active_profile.name ?? "Barn Family"}
      familyName={dashboard.family_name}
      quickActions={[
        { href: "/projects/new", label: "Add Project", emoji: "🐄" },
        { href: "/expenses/new", label: "Add Expense", emoji: "💵" },
        { href: "/income", label: "Add Income", emoji: "💰" },
        { href: "/inventory", label: "Inventory", emoji: "🧰" },
        { href: "/shows", label: "View Shows", emoji: "🏆" },
        { href: "/profile-picker", label: "Switch Profile", emoji: "👤" }
      ]}
      activeProjects={dashboard.active_projects}
      upcomingShows={dashboard.upcoming_shows}
      recentExpenses={dashboard.recent_expenses}
      recentActivity={dashboard.recent_activity}
      lowFeedInventory={dashboard.low_feed_inventory}
      recentFeedEvents={dashboard.recent_feed_events}
      financeSummary={dashboard.finance_summary}
      hasLoadError={hasLoadError}
      unreadNotifications={dashboard.unread_notifications}
      upcomingReminders={dashboard.upcoming_reminders}
    />
  );
}
