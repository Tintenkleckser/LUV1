export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }
    const assessment = await prisma.assessment.findUnique({
      where: { id: params?.id ?? '' },
      include: { client: true },
    });
    if (!assessment) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }
    return NextResponse.json(assessment);
  } catch (err: any) {
    console.error('Assessment GET by id error:', err);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }
    const body = await request.json();
    const updateData: any = {};
    if (body?.ratings !== undefined) updateData.ratings = body.ratings;
    if (body?.notes !== undefined) updateData.notes = body.notes;
    if (body?.aiAnalysis !== undefined) updateData.aiAnalysis = body.aiAnalysis;
    if (body?.status !== undefined) updateData.status = body.status;
    if (body?.currentPhase !== undefined) updateData.currentPhase = body.currentPhase;
    if (body?.currentIndex !== undefined) updateData.currentIndex = body.currentIndex;
    for (let i = 1; i <= 7; i++) {
      const key = `q${i}`;
      if (body?.[key] !== undefined) updateData[key] = body[key];
    }

    const assessment = await prisma.assessment.update({
      where: { id: params?.id ?? '' },
      data: updateData,
    });
    return NextResponse.json(assessment);
  } catch (err: any) {
    console.error('Assessment PATCH error:', err);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
