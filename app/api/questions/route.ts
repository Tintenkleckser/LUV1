export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .order('sort_no', { ascending: true });

    if (error) {
      console.error('Supabase questions error:', error);
      return NextResponse.json({ error: error?.message ?? 'Fehler' }, { status: 500 });
    }

    const mapped = (data ?? [])?.map((q: any) => ({
      id: q?.id ?? '',
      question: q?.question_text ?? '',
      hint: q?.hint ?? '',
      order: q?.sort_no ?? 0,
    }));

    return NextResponse.json(mapped);
  } catch (err: any) {
    console.error('Questions error:', err);
    return NextResponse.json({ error: err?.message ?? 'Interner Fehler' }, { status: 500 });
  }
}
