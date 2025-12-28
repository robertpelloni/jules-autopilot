import { NextResponse } from 'next/server';
import { setSession } from '@/lib/session';

export async function POST(req: Request) {
  try {
    const { apiKey } = await req.json();
    if (!apiKey) return NextResponse.json({ error: 'API Key required' }, { status: 400 });

    await setSession(apiKey);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
