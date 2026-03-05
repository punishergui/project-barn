import { headers } from "next/headers";

export async function apiFetchServer(path: string, init?: RequestInit): Promise<Response> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const incomingHeaders = headers();
  const host = incomingHeaders.get("host") ?? "localhost:3000";
  const proto = incomingHeaders.get("x-forwarded-proto") ?? "http";
  const requestHeaders = new Headers(init?.headers);
  const cookieHeader = incomingHeaders.get("cookie");
  if (cookieHeader) {
    requestHeaders.set("cookie", cookieHeader);
  }

  return fetch(`${proto}://${host}/api${normalizedPath}`, {
    credentials: "include",
    cache: "no-store",
    ...init,
    headers: requestHeaders
  });
}
