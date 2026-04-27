export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }
    const userId = (session.user as any)?.id ?? '';
    const clients = await prisma.client.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { assessments: true } } },
    });
    return NextResponse.json(clients ?? []);
  } catch (err: any) {
    console.error('Clients GET error:', err);
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
    const clientCode = body?.client_code ?? body?.client_id ?? '';

    if (!clientCode?.trim()) {
      return NextResponse.json({ error: 'Teilnehmenden-ID ist erforderlich' }, { status: 400 });
    }

    // Check for duplicate
    const existing = await prisma.client.findUnique({
      where: { userId_clientCode: { userId, clientCode: clientCode.trim() } },
    });
    if (existing) {
      return NextResponse.json({ error: 'Diese Teilnehmenden-ID existiert bereits' }, { status: 400 });
    }

    const client = await prisma.client.create({
      data: { clientCode: clientCode.trim(), userId },
    });
    return NextResponse.json(client, { status: 201 });
  } catch (err: any) {
    console.error('Clients POST error:', err);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
