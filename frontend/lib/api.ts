const isServer = typeof window === "undefined";
const serverBase =
  process.env.INTERNAL_API_BASE_URL ??
  (process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/api`
    : "http://barn-backend:5000/api");

export const API_BASE_URL = isServer ? serverBase : "/api";

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

export async function apiFetch<T>(path: string): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  const response = await fetch(`${API_BASE_URL}${normalizedPath}`, {
    credentials: "include",
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const getSession = () => apiFetch<SessionResponse>("/session");
export const getDashboard = () => apiFetch<DashboardResponse>("/dashboard");
export const getProjects = () => apiFetch<ProjectListItem[]>("/projects");
export const getProject = (id: number) => apiFetch<ProjectDetail>(`/projects/${id}`);
