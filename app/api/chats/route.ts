export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  createChatViaSupabase,
  deleteChatViaSupabase,
  isPrismaRecoverableDbError,
  listChatsViaSupabase,
  normalizeChatRow,
  updateChatTextViaSupabase,
} from '@/lib/app-db-fallback';

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

    try {
      const chats = await prisma.chat.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json((chats ?? []).map(normalizeChatRow));
    } catch (error: any) {
      if (!isPrismaRecoverableDbError(error)) throw error;
      const chats = await listChatsViaSupabase(userId, assessmentId);
      return NextResponse.json(chats ?? []);
    }
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

    try {
      const chat = await prisma.chat.create({
        data: {
          assessmentId: body?.assessment_id ?? null,
          clientId: body?.client_id ?? null,
          userId,
          title: body?.title ?? 'Neuer Chat',
          text: body?.text ?? body?.title ?? 'Neuer Chat',
        },
      });
      return NextResponse.json(normalizeChatRow(chat), { status: 201 });
    } catch (error: any) {
      if (!isPrismaRecoverableDbError(error)) throw error;
      const chat = await createChatViaSupabase(userId, body);
      return NextResponse.json(chat, { status: 201 });
    }
  } catch (err: any) {
    console.error('Chat POST error:', err);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }
    const userId = (session.user as any)?.id ?? '';
    const body = await request.json();
    const id = body?.id ?? '';
    const text = String(body?.text ?? '').trim();
    if (!id || !text) {
      return NextResponse.json({ error: 'id und text erforderlich' }, { status: 400 });
    }

    try {
      const existingChat = await prisma.chat.findFirst({
        where: { id, userId },
        select: { id: true },
      });
      if (!existingChat) {
        return NextResponse.json({ error: 'Chat nicht gefunden' }, { status: 404 });
      }

      const chat = await prisma.chat.update({
        where: { id },
        data: { text, title: text },
      });
      return NextResponse.json(normalizeChatRow(chat));
    } catch (error: any) {
      if (!isPrismaRecoverableDbError(error)) throw error;
      const chat = await updateChatTextViaSupabase(id, userId, text);
      if (!chat) {
        return NextResponse.json({ error: 'Chat nicht gefunden' }, { status: 404 });
      }
      return NextResponse.json(chat);
    }
  } catch (err: any) {
    console.error('Chat PATCH error:', err);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }
    const userId = (session.user as any)?.id ?? '';
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') ?? '';
    if (!id) {
      return NextResponse.json({ error: 'id erforderlich' }, { status: 400 });
    }

    try {
      const chat = await prisma.chat.findFirst({
        where: { id, userId },
        select: { id: true },
      });
      if (!chat) {
        return NextResponse.json({ error: 'Chat nicht gefunden' }, { status: 404 });
      }
      await prisma.chat.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    } catch (error: any) {
      if (!isPrismaRecoverableDbError(error)) throw error;
      const deleted = await deleteChatViaSupabase(id, userId);
      if (!deleted) {
        return NextResponse.json({ error: 'Chat nicht gefunden' }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    }
  } catch (err: any) {
    console.error('Chat DELETE error:', err);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
