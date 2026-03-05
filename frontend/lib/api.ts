const SERVER_API_BASE_URL = process.env.API_BASE_URL || "http://barn-backend:5000/api";
const BROWSER_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function normalizePath(path: string): string {
  if (!path) {
    return "/";
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const safe = path.startsWith("/") ? path : `/${path}`;
  return safe.startsWith("/api/") ? safe.slice(4) : safe === "/api" ? "/" : safe;
}

function buildApiUrl(path: string): string {
  const normalizedPath = normalizePath(path);

  if (normalizedPath.startsWith("http://") || normalizedPath.startsWith("https://")) {
    return normalizedPath;
  }

  const base = typeof window === "undefined" ? SERVER_API_BASE_URL : BROWSER_API_BASE_URL;
  return `${trimTrailingSlash(base)}${normalizedPath}`;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = buildApiUrl(path);
  const response = await fetch(url, {
    ...init,
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`API request failed (${response.status}) for ${url}`);
  }

  return response.json() as Promise<T>;
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
