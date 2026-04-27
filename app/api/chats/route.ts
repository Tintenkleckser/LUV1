export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }
    const userId = (session.user as any)?.id ?? '';
    const { searchParams } = new URL(request.url);
    const assessmentId = searchParams.get('assessment_id');

    const where: any = { userId };
    if (assessmentId) where.assessmentId = assessmentId;

    const chats = await prisma.chat.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(chats ?? []);
  } catch (err: any) {
    console.error('Chats GET error:', err);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }
    const userId = (session.user as any)?.id ?? '';
    const body = await request.json();

    const chat = await prisma.chat.create({
      data: {
        assessmentId: body?.assessment_id ?? null,
        clientId: body?.client_id ?? null,
        userId,
        title: body?.title ?? 'Neuer Chat',
      },
    });
    return NextResponse.json(chat, { status: 201 });
  } catch (err: any) {
    console.error('Chat POST error:', err);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
