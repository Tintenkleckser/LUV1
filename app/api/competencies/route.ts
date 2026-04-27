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
      .from('competencies')
      .select('*')
      .order('order', { ascending: true });

    if (error) {
      console.error('Supabase competencies error:', error);
      return NextResponse.json({ error: error?.message ?? 'Fehler' }, { status: 500 });
    }

    // Map to standardized format
    const mapped = (data ?? [])?.map((c: any) => ({
      id: c?.id ?? '',
      name: c?.description ?? '',
      category: c?.category ?? '',
      description: c?.definition ?? '',
      indicators: c?.indicators ?? '',
      k_id: c?.k_id ?? '',
      order_index: c?.order ?? 0,
    }));

    return NextResponse.json(mapped);
  } catch (err: any) {
    console.error('Competencies error:', err);
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 });
  }
}
