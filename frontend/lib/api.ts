import { apiFetchClient } from "@/lib/apiClient";
import { apiFetchServer } from "@/lib/apiServer";

export type Profile = { id: number; name: string; role: "parent" | "kid" | string; avatar_url: string | null };
export type SessionResponse = { active_profile: Profile | null; family: { id: null; name: null } };
export type AuthStatus = { role: string | null; is_unlocked: boolean; unlock_expires_at: string | null };
export type Project = {
  id: number;
  name: string;
  species: string;
  tag: string | null;
  status: string;
  owner_profile_id: number;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};
export type Expense = {
  id: number;
  project_id: number;
  date: string;
  category: string;
  vendor: string | null;
  amount: number;
  note: string | null;
  receipt_url: string | null;
  created_at: string | null;
  updated_at: string | null;
};

async function parseJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((body as { error?: string }).error ?? `Request failed with ${response.status}`);
  }
  return body as T;
}

export const apiClientJson = async <T>(path: string, init?: RequestInit) => parseJson<T>(await apiFetchClient(path, init));
export const apiServerJson = async <T>(path: string, init?: RequestInit) => parseJson<T>(await apiFetchServer(path, init));

export const getSession = () => apiServerJson<SessionResponse>("/session");
export const getSummary = () => apiServerJson<{ counts: Record<string, number>; month_total: number; by_project: { name: string; total: number }[] }>("/summary");
