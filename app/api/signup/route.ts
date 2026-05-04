export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createUserViaSupabase, findUserByEmailViaSupabase, isPrismaConnectionError } from '@/lib/app-db-fallback';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body ?? {};
    const normalizedEmail = String(email ?? '').toLowerCase().trim();

    if (!normalizedEmail || !password) {
      return NextResponse.json({ error: 'Email und Passwort sind erforderlich' }, { status: 400 });
    }

    let existingUser: any = null;
    try {
      existingUser = await findUserByEmailViaSupabase(normalizedEmail);
    } catch (supabaseError: any) {
      try {
        existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      } catch (prismaError: any) {
        if (isPrismaConnectionError(prismaError)) throw supabaseError;
        throw prismaError;
      }
    }
    if (existingUser) {
      return NextResponse.json({ error: 'Diese E-Mail-Adresse ist bereits registriert' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    let user: any;
    try {
      user = await createUserViaSupabase({ email: normalizedEmail, password: hashedPassword, name: name ?? null });
    } catch (supabaseError: any) {
      try {
        user = await prisma.user.create({
          data: { email: normalizedEmail, password: hashedPassword, name: name ?? null },
        });
      } catch (prismaError: any) {
        if (isPrismaConnectionError(prismaError)) throw supabaseError;
        throw prismaError;
      }
    }

    return NextResponse.json({ id: user.id, email: user.email, name: user.name }, { status: 201 });
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: error?.message ?? 'Registrierung fehlgeschlagen' }, { status: 500 });
  }
}
