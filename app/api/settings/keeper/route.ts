import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SessionKeeperConfig } from '@jules/shared';
import { getSession } from '@/lib/session';

const DEFAULT_SETTINGS: SessionKeeperConfig = {
  isEnabled: false,
  autoSwitch: false,
  checkIntervalSeconds: 30,
  inactivityThresholdMinutes: 1,
  activeWorkThresholdMinutes: 30,
  messages: [],
  customMessages: {},
  smartPilotEnabled: false,
  supervisorProvider: 'openai',
  supervisorApiKey: '',
  supervisorModel: 'gpt-4o',
  contextMessageCount: 10,
  shadowPilotEnabled: false,
  lastShadowPilotCommit: null,
};

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.workspaceId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const settings = await prisma.keeperSettings.findUnique({
      where: { id: session.workspaceId }
    });

    if (!settings) {
      return NextResponse.json(DEFAULT_SETTINGS);
    }

    return NextResponse.json({
      ...settings,
      messages: JSON.parse(settings.messages),
      customMessages: JSON.parse(settings.customMessages),
    });
  } catch (error) {
    console.error('[Settings Keeper] GET failed, returning defaults:', error);
    return NextResponse.json(DEFAULT_SETTINGS); // Graceful fallback
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.workspaceId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { messages, customMessages, ...rest } = body;

    const settings = await prisma.keeperSettings.upsert({
      where: { id: session.workspaceId },
      update: {
        ...rest,
        messages: JSON.stringify(messages || []),
        customMessages: JSON.stringify(customMessages || {}),
      },
      create: {
        ...rest,
        id: session.workspaceId,
        workspaceId: session.workspaceId,
        messages: JSON.stringify(messages || []),
        customMessages: JSON.stringify(customMessages || {}),
      }
    });

    return NextResponse.json({
      ...settings,
      messages: JSON.parse(settings.messages),
      customMessages: JSON.parse(settings.customMessages),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
