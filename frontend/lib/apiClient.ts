export async function apiFetchClient(path: string, init?: RequestInit): Promise<Response> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return fetch(`/api${normalizedPath}`, {
    credentials: "include",
    cache: "no-store",
    ...init
  });
}
