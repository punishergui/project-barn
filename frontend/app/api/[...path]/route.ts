import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.INTERNAL_API_BASE_URL ?? "http://barn-backend:5000/api";

type ProxyContext = {
  params: {
    path?: string[];
  };
};

function buildForwardHeaders(request: NextRequest, hasBody: boolean) {
  const headers = new Headers();
  const cookie = request.headers.get("cookie");
  const contentType = request.headers.get("content-type");

  if (cookie) {
    headers.set("cookie", cookie);
  }
  if (hasBody && contentType) {
    headers.set("content-type", contentType);
  }

  return headers;
}

async function proxy(request: NextRequest, { params }: ProxyContext): Promise<NextResponse> {
  const path = (params.path ?? []).join("/");
  const targetUrl = `${API_BASE}${path ? `/${path}` : ""}${request.nextUrl.search}`;
  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  const backendResponse = await fetch(targetUrl, {
    method: request.method,
    headers: buildForwardHeaders(request, hasBody),
    body: hasBody ? await request.text() : undefined,
    redirect: "manual",
    cache: "no-store"
  });

  const responseHeaders = new Headers();
  const contentType = backendResponse.headers.get("content-type");
  if (contentType) {
    responseHeaders.set("content-type", contentType);
  }

  const setCookieValues = (backendResponse.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.();
  if (setCookieValues?.length) {
    for (const value of setCookieValues) {
      responseHeaders.append("set-cookie", value);
    }
  }

  if (backendResponse.status === 204 || backendResponse.status === 304) {
    return new NextResponse(null, { status: backendResponse.status, headers: responseHeaders });
  }

  return new NextResponse(await backendResponse.text(), {
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
