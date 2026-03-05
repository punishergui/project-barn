import "server-only";

import { headers } from "next/headers";

import { API_BASE_URL } from "@/lib/api";

export async function apiFetchServer(path: string, init?: RequestInit): Promise<Response> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const incomingHeaders = headers();
  const requestHeaders = new Headers(init?.headers);

  const cookieHeader = incomingHeaders.get("cookie");
  if (cookieHeader) {
    requestHeaders.set("cookie", cookieHeader);
  }

  const xForwardedFor = incomingHeaders.get("x-forwarded-for");
  if (xForwardedFor) {
    requestHeaders.set("x-forwarded-for", xForwardedFor);
  }

  const xForwardedProto = incomingHeaders.get("x-forwarded-proto");
  if (xForwardedProto) {
    requestHeaders.set("x-forwarded-proto", xForwardedProto);
  }

  const xForwardedHost = incomingHeaders.get("x-forwarded-host");
  if (xForwardedHost) {
    requestHeaders.set("x-forwarded-host", xForwardedHost);
  }

  const host = incomingHeaders.get("host");
  if (host) {
    requestHeaders.set("host", host);
  }

  return fetch(`${API_BASE_URL}${normalizedPath}`, {
    credentials: "include",
    cache: "no-store",
    ...init,
    headers: requestHeaders
  });
}


async function parseJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((body as { error?: string }).error ?? `Request failed with ${response.status}`);
  }
  return body as T;
}

export const apiJsonServer = async <T>(path: string, init?: RequestInit) => parseJson<T>(await apiFetchServer(path, init));
