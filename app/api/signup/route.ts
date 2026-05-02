export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createUserViaSupabase, findUserByEmailViaSupabase, isPrismaConnectionError } from '@/lib/app-db-fallback';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body ?? {};

    if (!email || !password) {
      return NextResponse.json({ error: 'Email und Passwort sind erforderlich' }, { status: 400 });
    }

    let existingUser: any = null;
    try {
      existingUser = await prisma.user.findUnique({ where: { email } });
    } catch (error: any) {
      if (!isPrismaConnectionError(error)) throw error;
      existingUser = await findUserByEmailViaSupabase(email);
    }
    if (existingUser) {
      return NextResponse.json({ error: 'Diese E-Mail-Adresse ist bereits registriert' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    let user: any;
    try {
      user = await prisma.user.create({
        data: { email, password: hashedPassword, name: name ?? null },
      });
    } catch (error: any) {
      if (!isPrismaConnectionError(error)) throw error;
      user = await createUserViaSupabase({ email, password: hashedPassword, name: name ?? null });
    }

    return NextResponse.json({ id: user.id, email: user.email, name: user.name }, { status: 201 });
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: error?.message ?? 'Registrierung fehlgeschlagen' }, { status: 500 });
  }
}
