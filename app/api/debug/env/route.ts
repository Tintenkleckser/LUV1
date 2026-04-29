export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function describeDatabaseUrl(value: string | undefined) {
  if (!value) {
    return { present: false };
  }

  try {
    const url = new URL(value);
    return {
      present: true,
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port || null,
      username: url.username,
      database: url.pathname.replace(/^\//, '') || null,
      searchParams: Array.from(url.searchParams.keys()).sort(),
    };
  } catch {
    return { present: true, parseError: true };
  }
}

export async function GET() {
  const database = describeDatabaseUrl(process.env.DATABASE_URL);
  let dbPing: { ok: boolean; error?: string } = { ok: false };

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbPing = { ok: true };
  } catch (error: any) {
    dbPing = {
      ok: false,
      error: error?.message ?? 'Unknown database error',
    };
  }

  return NextResponse.json({
    database,
    dbPing,
    nextauthUrlPresent: Boolean(process.env.NEXTAUTH_URL),
    supabaseUrlPresent: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
  });
}
