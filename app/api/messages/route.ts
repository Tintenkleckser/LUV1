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
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chat_id');
    if (!chatId) {
      return NextResponse.json({ error: 'chat_id erforderlich' }, { status: 400 });
    }

    const messages = await prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(messages ?? []);
  } catch (err: any) {
    console.error('Messages GET error:', err);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }
    const body = await request.json();

    const content = body?.content ?? '';
    const chatId = body?.chat_id ?? '';
    const message = await prisma.message.create({
      data: {
        chatId,
        role: body?.role ?? 'user',
        content,
      },
    });
    if (chatId && content) {
      await prisma.chat.update({
        where: { id: chatId },
        data: { lastMessage: String(content).slice(0, 240) },
      });
    }
    return NextResponse.json(message, { status: 201 });
  } catch (err: any) {
    console.error('Message POST error:', err);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
