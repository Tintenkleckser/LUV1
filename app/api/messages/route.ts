export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  chatPreviewText,
  createMessageViaSupabase,
  findChatForUserViaSupabase,
  isPrismaRecoverableDbError,
  listMessagesViaSupabase,
  updateChatPreviewViaSupabase,
} from '@/lib/app-db-fallback';

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

    const userId = (session.user as any)?.id ?? '';

    try {
      const chat = await prisma.chat.findFirst({
        where: { id: chatId, userId },
        select: { id: true },
      });
      if (!chat) {
        return NextResponse.json({ error: 'Chat nicht gefunden' }, { status: 404 });
      }

      const messages = await prisma.message.findMany({
        where: { chatId },
        orderBy: { createdAt: 'asc' },
      });
      return NextResponse.json(messages ?? []);
    } catch (error: any) {
      if (!isPrismaRecoverableDbError(error)) throw error;
      const messages = await listMessagesViaSupabase(chatId, userId);
      if (!messages) {
        return NextResponse.json({ error: 'Chat nicht gefunden' }, { status: 404 });
      }
      return NextResponse.json(messages);
    }
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
    const userId = (session.user as any)?.id ?? '';

    const content = body?.content ?? '';
    const chatId = body?.chat_id ?? '';
    const role = body?.role ?? 'user';
    const text = chatPreviewText(content);

    try {
      const chat = await prisma.chat.findFirst({
        where: { id: chatId, userId },
        select: { id: true },
      });
      if (!chat) {
        return NextResponse.json({ error: 'Chat nicht gefunden' }, { status: 404 });
      }

      const message = await prisma.message.create({
        data: {
          chatId,
          role,
          content,
        },
      });
      if (chatId && content) {
        await prisma.chat.update({
          where: { id: chatId },
          data: role === 'user' ? { lastMessage: text, text } : { lastMessage: text },
        });
      }
      return NextResponse.json(message, { status: 201 });
    } catch (error: any) {
      if (!isPrismaRecoverableDbError(error)) throw error;
      const chat = await findChatForUserViaSupabase(chatId, userId);
      if (!chat) {
        return NextResponse.json({ error: 'Chat nicht gefunden' }, { status: 404 });
      }

      const message = await createMessageViaSupabase(chatId, role, content);
      if (chatId && content) {
        await updateChatPreviewViaSupabase(chatId, text, role === 'user');
      }
      return NextResponse.json(message, { status: 201 });
    }
  } catch (err: any) {
    console.error('Message POST error:', err);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
