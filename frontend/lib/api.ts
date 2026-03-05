const SERVER_BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || "http://barn-backend:5000";
const API_PREFIX = "/api";

function normalizeApiPath(endpoint: string): string {
  if (!endpoint) {
    return API_PREFIX;
  }

  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    return endpoint;
  }

  if (endpoint.startsWith(`${API_PREFIX}/`) || endpoint === API_PREFIX) {
    return endpoint;
  }

  return `${API_PREFIX}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
}

function buildApiUrl(endpoint: string): string {
  const normalizedPath = normalizeApiPath(endpoint);

  if (normalizedPath.startsWith("http://") || normalizedPath.startsWith("https://")) {
    return normalizedPath;
  }

  if (typeof window === "undefined") {
    return `${SERVER_BACKEND_ORIGIN}${normalizedPath}`;
  }

  return normalizedPath;
}

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
  updated_at: string | null;
  summary: { total_cost: number; expenses_count: number; photos_count: number; shows_count: number };
  recent_activity: { id: number; date: string | null; type: string; note: string | null }[];
};

async function apiFetch<T>(path: string): Promise<T> {
  const response = await fetch(buildApiUrl(path), {
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
