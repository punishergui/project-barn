export const API_BASE_URL = "/api";

export type Profile = { id: number; name: string; role: "parent" | "kid" | string; avatar_url: string | null };
export type SessionResponse = { active_profile: Profile | null; family: { id: null; name: null } };
export type AuthStatus = { role: string | null; is_unlocked: boolean; unlock_expires_at: string | null };
export type Project = { id: number; name: string; species: string; tag: string | null; status: string; owner_profile_id: number; notes: string | null; created_at: string | null; updated_at: string | null };
export type Expense = { id: number; project_id: number; date: string; category: string; vendor: string | null; amount: number; note: string | null; receipt_url: string | null; created_at: string | null; updated_at: string | null };
export type ShowDay = { id: number; show_id: number; day_date: string | null; label: string };
export type Placing = { id: number; entry_id: number; show_day_id: number; ring: string | null; placing_text: string; points: number | null; judge: string | null; notes: string | null };
export type ShowEntry = { id: number; show_id: number; project_id: number; class_name: string | null; division: string | null; notes: string | null; placings: Placing[] };
export type Show = { id: number; name: string; location: string; start_date: string; end_date: string | null; notes: string | null; days: ShowDay[]; entries: ShowEntry[] };
export type TaskItem = { id: number; project_id: number | null; title: string; due_date: string | null; recurrence: "none" | "daily" | "weekly"; assigned_profile_id: number | null; status: "open" | "done"; priority: "low" | "normal" | "high"; notes: string | null; created_at: string | null; updated_at: string | null; completed_at: string | null };
export type MediaItem = { id: number; project_id: number | null; show_id: number | null; show_day_id: number | null; kind: string; filename: string; url: string; caption: string | null; created_at: string | null };
export type AppSettings = { family_name: string | null; allow_kid_task_toggle: boolean };

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return fetch(`${API_BASE_URL}${normalizedPath}`, {
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
