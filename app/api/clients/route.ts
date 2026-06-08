export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  createClientViaSupabase,
  deleteClientCompletelyViaSupabase,
  findClientViaSupabase,
  isPrismaConnectionError,
  listClientsViaSupabase,
} from '@/lib/app-db-fallback';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }
    const userId = (session.user as any)?.id ?? '';
    let clients;
    try {
      clients = await prisma.client.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { assessments: true } } },
      });
    } catch (err: any) {
      if (!isPrismaConnectionError(err)) throw err;
      clients = await listClientsViaSupabase(userId);
    }
    return NextResponse.json(clients ?? []);
  } catch (err: any) {
    console.error('Clients GET error:', err);
    return NextResponse.json({ error: err?.message ?? 'Interner Fehler' }, { status: 500 });
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
    const clientCode = body?.client_code ?? body?.client_id ?? '';

    if (!clientCode?.trim()) {
      return NextResponse.json({ error: 'Teilnehmenden-ID ist erforderlich' }, { status: 400 });
    }

    // Check for duplicate
    let existing;
    try {
      existing = await prisma.client.findUnique({
        where: { userId_clientCode: { userId, clientCode: clientCode.trim() } },
      });
    } catch (err: any) {
      if (!isPrismaConnectionError(err)) throw err;
      existing = await findClientViaSupabase(userId, clientCode.trim());
    }
    if (existing) {
      return NextResponse.json({ error: 'Diese Teilnehmenden-ID existiert bereits' }, { status: 400 });
    }

    let client;
    try {
      client = await prisma.client.create({
        data: { clientCode: clientCode.trim(), userId },
      });
    } catch (err: any) {
      if (!isPrismaConnectionError(err)) throw err;
      client = await createClientViaSupabase(userId, clientCode.trim());
    }
    return NextResponse.json(client, { status: 201 });
  } catch (err: any) {
    console.error('Clients POST error:', err);
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'Diese Teilnehmenden-ID existiert bereits' }, { status: 400 });
    }
    if (err?.code === 'P2003') {
      return NextResponse.json({ error: 'Der angemeldete Benutzer wurde in der Datenbank nicht gefunden' }, { status: 400 });
    }
    return NextResponse.json({ error: err?.message ?? 'Interner Fehler' }, { status: 500 });
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
      const client = await prisma.client.findFirst({
        where: { id, userId },
        select: { id: true },
      });
      if (!client) {
        return NextResponse.json({ error: 'Teilnehmende/r nicht gefunden' }, { status: 404 });
      }

      const assessments = await prisma.assessment.findMany({
        where: { clientId: id, userId },
        select: { id: true },
      });
      const assessmentIds = assessments.map((assessment) => assessment.id);

      const chats = await prisma.chat.findMany({
        where: {
          userId,
          OR: [
            { clientId: id },
            ...(assessmentIds.length > 0 ? [{ assessmentId: { in: assessmentIds } }] : []),
          ],
        },
        select: { id: true },
      });
      const chatIds = chats.map((chat) => chat.id);

      await prisma.$transaction([
        ...(chatIds.length > 0
          ? [
              prisma.message.deleteMany({ where: { chatId: { in: chatIds } } }),
              prisma.chat.deleteMany({ where: { id: { in: chatIds }, userId } }),
            ]
          : []),
        ...(assessmentIds.length > 0
          ? [prisma.assessment.deleteMany({ where: { id: { in: assessmentIds }, userId } })]
          : []),
        prisma.client.delete({ where: { id } }),
      ]);

      return NextResponse.json({ ok: true });
    } catch (err: any) {
      if (!isPrismaConnectionError(err)) throw err;
      const deleted = await deleteClientCompletelyViaSupabase(userId, id);
      if (!deleted) {
        return NextResponse.json({ error: 'Teilnehmende/r nicht gefunden' }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    }
  } catch (err: any) {
    console.error('Clients DELETE error:', err);
    return NextResponse.json({ error: err?.message ?? 'Interner Fehler' }, { status: 500 });
  }
}
