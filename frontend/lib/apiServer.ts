import { headers } from "next/headers";

export async function apiFetchServer(path: string, init?: RequestInit): Promise<Response> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const base = process.env.INTERNAL_API_BASE_URL ?? "http://barn-backend:5000/api";
  const requestHeaders = new Headers(init?.headers);

  if (!requestHeaders.has("cookie")) {
    const incomingHeaders = headers();
    const cookieHeader = incomingHeaders.get("cookie");
    if (cookieHeader) {
      requestHeaders.set("cookie", cookieHeader);
    }
  }

  return fetch(`${base}${normalizedPath}`, {
    credentials: "include",
    cache: "no-store",
    ...init,
    headers: requestHeaders
  });
}
