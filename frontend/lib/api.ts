import { apiFetchClient } from "@/lib/apiClient";
import { apiFetchServer } from "@/lib/apiServer";

export type SessionResponse = {
  active_profile: { id: number | null; name: string | null; role: string | null; avatar_url: string | null };
  family: { id: null; name: null };
};

export type DashboardResponse = {
  counts: { projects: number; profiles: number; expenses: number; shows: number; tasks: number };
  recent_activity: { kind: string; label: string; date: string | null; project_id: number | null }[];
  upcoming: { kind: string; label: string; date: string | null; project_id: number | null }[];
};

export type ProjectListItem = {
  id: number;
  name: string;
  animal_type: string | null;
  owner_profile: { id: number; name: string };
  hero_image_url: string | null;
  updated_at: string | null;
  total_cost: number;
  ribbon_count: number;
};

export type ProjectDetail = {
  id: number;
  name: string;
  animal_type: string | null;
  owner_profile: { id: number; name: string };
  hero_image_url: string | null;
  summary: { total_cost: number; expenses_count: number; photos_count: number; shows_count: number };
  recent_activity: { id: number; date: string | null; type: string; note: string | null }[];
};

async function parseApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function apiFetchClientJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetchClient(path, init);
  return parseApiResponse<T>(response);
}

export async function apiFetchServerJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetchServer(path, init);
  return parseApiResponse<T>(response);
}

export const getSession = () => apiFetchServerJson<SessionResponse>("/session");
export const getDashboard = () => apiFetchServerJson<DashboardResponse>("/dashboard");
export const getProjects = () => apiFetchServerJson<ProjectListItem[]>("/projects");
export const getProject = (id: number) => apiFetchServerJson<ProjectDetail>(`/projects/${id}`);
