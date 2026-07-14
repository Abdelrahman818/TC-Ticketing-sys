import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

export const dynamic = 'force-dynamic';

async function proxy(request) {
  const requestUrl = new URL(request.url);
  const targetUrl = new URL(requestUrl.pathname + requestUrl.search, BACKEND_URL);

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('connection');

  let body;
  if (!['GET', 'HEAD'].includes(request.method)) {
    try {
      body = request.body ? request.body : undefined;
    } catch {
      body = undefined;
    }
  }

  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body,
  });

  const responseBody = await response.arrayBuffer();
  const nextResponse = new NextResponse(responseBody, { status: response.status });

  response.headers.forEach((value, key) => {
    if (!['content-length', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
      nextResponse.headers.set(key, value);
    }
  });

  return nextResponse;
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
