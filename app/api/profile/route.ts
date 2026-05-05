import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  findUserProfileViaSupabase,
  isPrismaConnectionError,
  updateUserProfileViaSupabase,
} from '@/lib/app-db-fallback';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    let user;
    try {
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          clients: {
            select: {
              id: true,
              clientCode: true,
              createdAt: true,
              _count: { select: { assessments: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: {
              assessments: true,
              clients: true,
            },
          },
        },
      });
    } catch (error) {
      if (!isPrismaConnectionError(error)) throw error;
      console.warn('Profile GET falling back to Supabase REST:', error);
      user = await findUserProfileViaSupabase(userId);
    }

    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Profile GET error:', error);
    return NextResponse.json({ error: 'Fehler beim Laden des Profils' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { name } = await request.json();

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name darf nicht leer sein' }, { status: 400 });
    }

    let updatedUser;
    try {
      updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { name: name.trim() },
        select: { id: true, name: true, email: true },
      });
    } catch (error) {
      if (!isPrismaConnectionError(error)) throw error;
      console.warn('Profile PATCH falling back to Supabase REST:', error);
      updatedUser = await updateUserProfileViaSupabase(userId, { name: name.trim() });
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Profile PATCH error:', error);
    return NextResponse.json({ error: 'Fehler beim Aktualisieren des Profils' }, { status: 500 });
  }
}
