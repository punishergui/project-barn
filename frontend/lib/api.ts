import { resolveApiPath, runtimeConfig } from "@/lib/runtimeConfig";

export const API_BASE_URL = runtimeConfig.apiBasePath;

export type Profile = { id: number; name: string; role: "parent" | "kid" | string; avatar_url: string | null; color?: string; archived?: boolean; club_name?: string | null; county?: string | null; state?: string | null; years_in_4h?: number | null; birthdate?: string | null; summary?: { active_projects: number; shows: number; expenses: number }; projects?: Project[] };
export type SessionResponse = { active_profile: Profile | null; family: { id: null; name: null } };
export type AuthStatus = { role: string | null; is_unlocked: boolean; unlock_expires_at: string | null };
export type Project = { id: number; name: string; species: string; project_type: string; is_livestock: boolean; project_category: string | null; breed: string | null; sex: string | null; ear_tag: string | null; target_weight: number | null; purchase_date: string | null; goal: string | null; materials_needed: string | null; completion_target_date: string | null; competition_category: string | null; tag: string | null; status: string; owner_profile_id: number; notes: string | null; photo_url: string | null; created_at: string | null; updated_at: string | null };
export type ExpenseReceipt = { id: number; expense_id: number; file_name: string; url: string; caption: string | null; created_at: string | null };
export type ExpenseAllocation = { id: number | null; expense_id: number; project_id: number; amount_cents: number; amount: number; created_at: string | null };
export type Expense = { id: number; project_id: number; date: string; category: string; vendor: string | null; amount: number; amount_cents: number; note: string | null; receipt_url: string | null; is_split: boolean; allocation_count: number; receipt_count: number; allocations: ExpenseAllocation[]; receipts: ExpenseReceipt[]; created_at: string | null; updated_at: string | null };
export type ShowDay = { id: number; show_id: number; day_number: number; label: string | null; show_date: string | null; date: string | null; notes: string | null; created_at: string | null };
export type Placing = { id: number; entry_id: number; show_id: number | null; show_day_id: number | null; project_id: number | null; class_name: string | null; ring: string | null; placing: string; ribbon_type: string | null; points: number | null; judge: string | null; notes: string | null; placed_at: string | null; photo_url: string | null; created_at: string | null };
export type ShowEntry = { id: number; show_id: number; project_id: number; class_name: string | null; division: string | null; weight: number | null; notes: string | null; placings: Placing[] };
export type Show = { id: number; name: string; location: string; start_date: string; end_date: string | null; notes: string | null; created_at?: string | null; days: ShowDay[]; entries: ShowEntry[] };
export type ShowDayTask = { id: number; show_day_id: number; project_id: number | null; task_key: string; task_label: string; is_completed: boolean; completed_at: string | null; notes: string | null; created_at: string | null; updated_at: string | null };
export type TaskItem = { id: number; project_id: number | null; title: string; due_date: string | null; recurrence: "none" | "daily" | "weekly"; assigned_profile_id: number | null; status: "open" | "done"; priority: "low" | "normal" | "high"; notes: string | null; created_at: string | null; updated_at: string | null; completed_at: string | null };
export type MediaItem = { id: number; project_id: number | null; timeline_entry_id: number | null; placing_id: number | null; show_id: number | null; show_day_id: number | null; kind: string; file_name: string; file_url: string; url: string; caption: string | null; created_at: string | null };
export type TimelineEntry = { id: number; project_id: number; type: string; title: string; description: string | null; date: string; created_at: string | null };
export type AppSettings = { family_name: string | null; county: string | null; state: string | null; club_name: string | null; default_project_year: number | null; default_species: string | null; default_checklist_template: string | null; default_show_tasks: string[]; brand_logo_url: string | null; brand_show_name: boolean; allow_kid_task_toggle: boolean };

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(resolveApiPath(path), {
    credentials: "include",
    cache: "no-store",
    ...init
  });
}

async function parseJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((body as { error?: string }).error ?? `Request failed with ${response.status}`);
  }
  return body as T;
}

export const apiJson = async <T>(path: string, init?: RequestInit) => parseJson<T>(await apiFetch(path, init));
export async function apiPostJson<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
  const requestHeaders = new Headers(init?.headers);
  requestHeaders.set("Content-Type", "application/json");

  return apiJson<T>(path, {
    ...init,
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify(body)
  });
}

export const apiClientJson = apiJson;


export type ProjectTask = { id: number; project_id: number; title: string; due_date: string | null; is_daily: boolean; is_completed: boolean; completed_at: string | null; created_at: string | null; updated_at: string | null };
export type WeightEntry = { id: number; project_id: number; recorded_at: string; weight_lbs: number; notes: string | null };
export type HealthEntry = { id: number; project_id: number; recorded_at: string; category: string; description: string; cost_cents: number | null; cost: number | null; vendor: string | null; attachment_receipt_url: string | null };
export type FeedEntry = { id: number; project_id: number; recorded_at: string; feed_type: string; amount: number; unit: string; cost_cents: number | null; cost: number | null; feed_inventory_item_id: number | null; feed_inventory_item_name: string | null; notes: string | null };
export type FeedInventoryItem = { id: number; name: string; brand: string | null; category: string | null; unit: string; qty_on_hand: number; low_stock_threshold: number | null; low_stock: boolean; notes: string | null; is_active: boolean; created_at: string | null; updated_at: string | null };
export type FamilyInventoryItem = { id: number; name: string; category: string; quantity: number; unit: string | null; location: string | null; condition: string | null; assigned_project_id: number | null; notes: string | null; low_stock: boolean; archived: boolean; created_at: string | null; updated_at: string | null };
export type ProjectMaterial = { id: number; project_id: number; logged_by_id: number; item_name: string; quantity: number | null; unit: string | null; unit_cost: number | null; total_cost: number | null; category: string | null; inventory_item_id: number | null; status: string | null; notes: string | null; date_purchased: string | null };
export type CareEntry = { id: number; project_id: number; recorded_at: string; category: string; label: string; title: string; notes: string | null; created_at: string | null };
export type ReportProjectSummary = { project_id: number; project_name: string; expenses_total_cents: number; health_total_cents: number; feed_total_cents: number; shows_count: number; entries_count: number; net_total_cents: number; expenses_total: number; health_total: number; feed_total: number; net_total: number };
export type ReportsSummary = { start_date: string | null; end_date: string | null; projects: ReportProjectSummary[]; overall: { expenses_total_cents: number; health_total_cents: number; feed_total_cents: number; shows_count: number; entries_count: number; grand_total_cents: number; expenses_total: number; health_total: number; feed_total: number; grand_total: number } };

export type FamilySeasonSummary = { totals: { expenses_total_cents: number; feed_total_cents: number; health_total_cents: number; shows_count: number; placings_count: number; grand_total_cents: number }; by_kid: Array<{ profile_id: number; profile_name: string; project_count: number; expenses_total_cents: number; feed_total_cents: number; health_total_cents: number; shows_count: number; placings_count: number; ribbons_count: number; total_cents: number }>; by_project: Array<{ project_id: number; project_name: string; owner_profile_id: number; owner_name: string; expenses_total_cents: number; feed_total_cents: number; health_total_cents: number; shows_count: number; placings_count: number; ribbons_count: number }> };
export type ProjectRecordBook = { project: Project; owner: { id: number; name: string; role: string } | null; expenses: { count: number; total_cents: number; total: number }; feed: { count: number; total_cents: number; total: number }; health: { count: number; total_cents: number; total: number }; tasks: { completed: number; open: number; total: number }; timeline: { count: number; entries: TimelineEntry[] }; shows: { count: number; items: Show[] }; placings: { count: number; items: Placing[] }; ribbons: { count: number }; media: { count: number } };
export type ChecklistItem = { id: number; project_id: number; title: string; category: string | null; is_completed: boolean; completed_at: string | null; notes: string | null; sort_order: number | null; created_at: string | null; updated_at: string | null };
export type ChecklistResponse = { items: ChecklistItem[]; summary: { total: number; completed: number; remaining: number; completion_percent: number } };
export type ShowReadinessItem = { id: number; project_id: number | null; show_id: number | null; item_name: string; is_completed: boolean; completed_at: string | null; show_day_id: number | null };
export type ShowReadinessResponse = { items: ShowReadinessItem[]; summary: { total: number; completed: number; remaining: number; completion_percent: number } };


export type IncomeType = "auction_sale" | "add_on" | "sponsorship" | "private_sale" | "prize_money" | "refund" | "other";
export type IncomeEntry = { id: number; project_id: number; profile_id: number | null; date: string; type: IncomeType | string; source: string | null; amount: number; amount_cents: number; notes: string | null; created_at: string | null; updated_at: string | null };
export type AuctionSale = { id: number; project_id: number; show_id: number | null; sale_date: string; buyer_name: string; sale_amount: number; add_ons_amount: number; fees_amount: number; final_payout: number; notes: string | null };
export type ProjectFinancialSummary = { project_id: number; project_name: string; owner_profile_id: number; owner_name?: string; total_expenses_cents: number; total_expenses: number; total_feed_cents: number; total_feed: number; total_health_cents: number; total_health: number; total_materials_cents?: number; total_materials?: number; total_income_cents: number; total_income: number; net_profit_loss_cents: number; net_profit_loss: number; latest_sale: AuctionSale | null };
export type FamilyFinancialSummary = { range: string; start_date: string | null; end_date: string | null; overall_totals: { total_expenses_cents: number; total_expenses: number; total_income_cents: number; total_income: number; net_family_balance_cents: number; net_family_balance: number }; by_project: ProjectFinancialSummary[]; by_member: Array<{ profile_id: number; member_name: string; total_project_expenses_cents: number; total_project_expenses: number; total_project_income_cents: number; total_project_income: number; net_total_cents: number; net_total: number }>; recent_sales: AuctionSale[] };

export type NotificationItem = {
  id: number;
  type: string;
  title: string;
  body: string | null;
  timestamp: string | null;
  profile: Profile | null;
  actor_profile: Profile | null;
  project: { id: number; name: string } | null;
  related_route: string | null;
  is_read: boolean;
};

export type NotificationsResponse = { items: NotificationItem[]; unread_count: number };

export type ProjectReminder = {
  id: number;
  project_id: number;
  type: string;
  enabled: boolean;
  time_of_day: string | null;
  frequency: string | null;
  notes: string | null;
  parent_locked: boolean;
  created_by_profile_id: number | null;
  updated_by_profile_id: number | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ActivityItem = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  timestamp: string;
  project_id: number | null;
  project_name: string | null;
  profile_id: number | null;
  profile_name: string | null;
  route: string;
};
