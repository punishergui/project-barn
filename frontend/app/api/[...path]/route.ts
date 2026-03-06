import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_BASE = process.env.INTERNAL_API_BASE_URL ?? "http://barn-backend:5000/api";

type ProxyContext = {
  params: {
    path?: string[];
  };
};

function buildForwardHeaders(request: NextRequest, hasBody: boolean) {
  const headers = new Headers();

  const cookie = request.headers.get("cookie");
  if (cookie) {
    headers.set("cookie", cookie);
  }

  if (hasBody) {
    const contentType = request.headers.get("content-type");
    if (contentType) {
      headers.set("content-type", contentType);
    }
  }

  return headers;
}

function copySetCookieHeaders(source: Headers, destination: Headers) {
  const headersWithSetCookie = source as Headers & { getSetCookie?: () => string[] };

  if (typeof headersWithSetCookie.getSetCookie === "function") {
    for (const cookie of headersWithSetCookie.getSetCookie()) {
      destination.append("set-cookie", cookie);
    }
    return;
  }

  const setCookie = source.get("set-cookie");
  if (setCookie) {
    destination.set("set-cookie", setCookie);
  }
}

async function proxy(request: NextRequest, { params }: ProxyContext): Promise<Response> {
  const path = (params.path ?? []).join("/");
  const targetUrl = `${API_BASE}${path ? `/${path}` : ""}${request.nextUrl.search}`;
  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  const requestBody = hasBody ? Buffer.from(await request.arrayBuffer()) : undefined;

  const backendResponse = await fetch(targetUrl, {
    method: request.method,
    headers: buildForwardHeaders(request, hasBody),
    body: requestBody,
    redirect: "manual",
    cache: "no-store"
  });

  const responseHeaders = new Headers();
  const contentType = backendResponse.headers.get("content-type");
  if (contentType) {
    responseHeaders.set("content-type", contentType);
  }

  copySetCookieHeaders(backendResponse.headers, responseHeaders);

  if (backendResponse.status === 204 || backendResponse.status === 304) {
    return new Response(null, { status: backendResponse.status, headers: responseHeaders });
  }

  return new Response(await backendResponse.text(), {
    status: backendResponse.status,
    headers: responseHeaders
  });
}

export async function GET(request: NextRequest, context: ProxyContext) {
  return proxy(request, context);
}

export async function POST(request: NextRequest, context: ProxyContext) {
  return proxy(request, context);
}

export async function PUT(request: NextRequest, context: ProxyContext) {
  return proxy(request, context);
}

export async function PATCH(request: NextRequest, context: ProxyContext) {
  return proxy(request, context);
}

export async function DELETE(request: NextRequest, context: ProxyContext) {
  return proxy(request, context);
}

export async function OPTIONS(request: NextRequest, context: ProxyContext) {
  return proxy(request, context);
}
