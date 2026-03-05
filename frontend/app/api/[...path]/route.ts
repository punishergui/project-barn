import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.INTERNAL_API_BASE_URL ?? "http://barn-backend:5000/api";

type ProxyContext = {
  params: {
    path?: string[];
  };
};

async function proxy(request: NextRequest, { params }: ProxyContext): Promise<NextResponse> {
  const path = (params.path ?? []).join("/");
  const targetUrl = `${API_BASE}${path ? `/${path}` : ""}${request.nextUrl.search}`;

  const outboundHeaders = new Headers(request.headers);
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    outboundHeaders.set("cookie", cookieHeader);
  }

  const init: RequestInit = {
    method: request.method,
    headers: outboundHeaders,
    redirect: "manual"
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  const backendResponse = await fetch(targetUrl, init);
  const responseHeaders = new Headers(backendResponse.headers);

  const setCookieValues = (backendResponse.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.();
  if (setCookieValues?.length) {
    responseHeaders.delete("set-cookie");
    for (const value of setCookieValues) {
      responseHeaders.append("set-cookie", value);
    }
  }

  let body: BodyInit | null = null;
  if (backendResponse.status !== 204 && backendResponse.status !== 304) {
    const contentType = backendResponse.headers.get("content-type") ?? "";
    if (contentType.includes("application/json") || contentType.startsWith("text/")) {
      body = await backendResponse.text();
    } else {
      body = await backendResponse.arrayBuffer();
    }
  }

  return new NextResponse(body, {
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
