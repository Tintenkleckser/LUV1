export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabase } from '@/lib/supabase';

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
  let prismaCounts: Record<string, number | string> = {};
  let supabaseChecks: Record<string, any> = {};

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbPing = { ok: true };
  } catch (error: any) {
    dbPing = {
      ok: false,
      error: error?.message ?? 'Unknown database error',
    };
  }

  try {
    const [users, clients, assessments] = await Promise.all([
      prisma.user.count(),
      prisma.client.count(),
      prisma.assessment.count(),
    ]);
    prismaCounts = { users, clients, assessments };
  } catch (error: any) {
    prismaCounts = { error: error?.message ?? 'Unknown Prisma count error' };
  }

  try {
    const [competencies, questions, wissenLuv, wissenHandbuch] = await Promise.all([
      supabase.from('competencies').select('*', { count: 'exact', head: true }),
      supabase.from('questions').select('*', { count: 'exact', head: true }),
      supabase.from('wissen_luv').select('*', { count: 'exact', head: true }),
      supabase.from('wissen_handbuch').select('*', { count: 'exact', head: true }),
    ]);
    supabaseChecks = {
      competencies: competencies.error ? { error: competencies.error.message } : { count: competencies.count },
      questions: questions.error ? { error: questions.error.message } : { count: questions.count },
      wissen_luv: wissenLuv.error ? { error: wissenLuv.error.message } : { count: wissenLuv.count },
      wissen_handbuch: wissenHandbuch.error ? { error: wissenHandbuch.error.message } : { count: wissenHandbuch.count },
    };
  } catch (error: any) {
    supabaseChecks = { error: error?.message ?? 'Unknown Supabase check error' };
  }

  return NextResponse.json({
    database,
    dbPing,
    prismaCounts,
    supabaseChecks,
    nextauthUrlPresent: Boolean(process.env.NEXTAUTH_URL),
    supabaseUrlPresent: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
  });
}
