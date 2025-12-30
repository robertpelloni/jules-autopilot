import { NextResponse, NextRequest } from 'next/server';
import { getSession } from '@/lib/session';

const JULES_API_BASE = 'https://jules.googleapis.com/v1alpha';

export async function GET(request: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  try {
    const session = await getSession();
    const apiKey = session?.apiKey;

    if (!apiKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await props.params;
    const path = `/${params.path.join('/')}`;
    const searchParams = request.nextUrl.searchParams.toString();
    const url = `${JULES_API_BASE}${path}${searchParams ? `?${searchParams}` : ''}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
      },
    });

    const data = await response.json().catch(() => ({}));

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[Jules API Proxy] Error:", error);
    return NextResponse.json(
      {
        error: "Proxy error",
        message: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  try {
    const session = await getSession();
    const apiKey = session?.apiKey;

    if (!apiKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await props.params;
    const path = `/${params.path.join('/')}`;
    const url = `${JULES_API_BASE}${path}`;
    const body = await request.text();

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
      },
      body: body || undefined,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // Only log critical errors (500s), skip 4xx client errors to reduce noise
      if (response.status >= 500) {
        console.error("[Jules API Proxy] Upstream Error:", {
          status: response.status,
          data,
        });
      }
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Proxy error",
        message: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  try {
    const session = await getSession();
    const apiKey = session?.apiKey;

    if (!apiKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await props.params;
    const path = `/${params.path.join('/')}`;
    const url = `${JULES_API_BASE}${path}`;

    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
      },
    });

    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Proxy error",
        message: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 },
    );
  }
}
