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
    const clientId = searchParams.get('client_id');

    const where: any = { userId };
    if (clientId) {
      where.clientId = clientId;
    }

    const assessments = await prisma.assessment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(assessments ?? []);
  } catch (err: any) {
    console.error('Assessments error:', err);
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

    const assessment = await prisma.assessment.create({
      data: {
        clientId: body?.client_id ?? '',
        userId,
        ratings: body?.ratings ?? {},
        notes: body?.notes ?? null,
        status: body?.status ?? 'completed',
        currentPhase: body?.currentPhase ?? 'ratings',
        currentIndex: body?.currentIndex ?? 0,
        q1: body?.q1 ?? null,
        q2: body?.q2 ?? null,
        q3: body?.q3 ?? null,
        q4: body?.q4 ?? null,
        q5: body?.q5 ?? null,
        q6: body?.q6 ?? null,
        q7: body?.q7 ?? null,
      },
    });
    return NextResponse.json(assessment, { status: 201 });
  } catch (err: any) {
    console.error('Assessment POST error:', err);
    return NextResponse.json({ error: err?.message ?? 'Interner Fehler' }, { status: 500 });
  }
}
