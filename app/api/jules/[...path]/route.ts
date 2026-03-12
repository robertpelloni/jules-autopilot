import { NextResponse, NextRequest } from 'next/server';

const JULES_API_BASE = 'https://jules.googleapis.com/v1alpha';

export async function GET(request: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  try {
    const apiKey = request.headers.get('X-Jules-Api-Key') || process.env.JULES_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'JULES_API_KEY not set in .env' }, { status: 500 });
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
    const apiKey = request.headers.get('X-Jules-Api-Key') || process.env.JULES_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'JULES_API_KEY not set in .env' }, { status: 500 });
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

export async function PATCH(request: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  try {
    const apiKey = request.headers.get('X-Jules-Api-Key') || process.env.JULES_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'JULES_API_KEY not set in .env' }, { status: 500 });
    }

    const params = await props.params;
    const path = `/${params.path.join('/')}`;
    const url = `${JULES_API_BASE}${path}`;
    const body = await request.text();

    // Google APIs often use 'updateMask' query param for PATCH, but we'll forward the body as-is for now
    // If the frontend needs to send query params (like updateMask), they should be in the URL path/query
    // The client constructs the URL, so we need to preserve search params from the incoming request
    const searchParams = request.nextUrl.searchParams.toString();
    const finalUrl = `${url}${searchParams ? `?${searchParams}` : ''}`;

    const response = await fetch(finalUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
      },
      body: body || undefined,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
       if (response.status >= 500) {
        console.error("[Jules API Proxy] Upstream PATCH Error:", {
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
    const apiKey = request.headers.get('X-Jules-Api-Key') || process.env.JULES_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'JULES_API_KEY not set in .env' }, { status: 500 });
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


