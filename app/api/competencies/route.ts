export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const COMPETENCY_FALLBACKS: Record<string, { description: string; indicators: string }> = {
  Verantwortungsbewusstsein: {
    description: 'Beschreibt die Bereitschaft und Fähigkeit, Verantwortung für das eigene Handeln, übertragene Aufgaben und gemeinsame Vereinbarungen zu übernehmen.',
    indicators: 'übernimmt Aufgaben verbindlich; hält Absprachen ein; erkennt Folgen des eigenen Handelns; geht zuverlässig mit Materialien, Zeit und Anforderungen um; meldet Schwierigkeiten rechtzeitig zurück',
  },
  Sorgfalt: {
    description: 'Beschreibt, wie gründlich, ordentlich und gewissenhaft Aufgaben vorbereitet, durchgeführt und abgeschlossen werden.',
    indicators: 'arbeitet aufmerksam und gründlich; achtet auf Ordnung und Vollständigkeit; kontrolliert Arbeitsergebnisse; geht mit Arbeitsmitteln achtsam um; vermeidet vermeidbare Fehler',
  },
  Genauigkeit: {
    description: 'Beschreibt die Fähigkeit, Anforderungen, Details und Arbeitsschritte präzise zu erfassen und möglichst fehlerarm umzusetzen.',
    indicators: 'beachtet Vorgaben und Details; arbeitet maßhaltig und präzise; prüft Zwischenschritte und Ergebnisse; korrigiert erkannte Fehler; hält Qualitätsanforderungen ein',
  },
  'Sorgfalt und Genauigkeit': {
    description: 'Beschreibt die Fähigkeit, Aufgaben gründlich, ordentlich, präzise und möglichst fehlerarm auszuführen.',
    indicators: 'arbeitet aufmerksam und gründlich; beachtet Vorgaben und Details; kontrolliert Arbeitsergebnisse; korrigiert erkannte Fehler; hält Qualitätsanforderungen ein',
  },
};

function withFallback(value: unknown, fallback: string | undefined) {
  const text = String(value ?? '').trim();
  return text || fallback || '';
}

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
    const mapped = (data ?? [])?.map((c: any) => {
      const name = c?.description ?? '';
      const fallback = COMPETENCY_FALLBACKS[name];

      return {
        id: c?.id ?? '',
        name,
        category: c?.category ?? '',
        description: withFallback(c?.definition, fallback?.description),
        indicators: withFallback(c?.indicators, fallback?.indicators),
        k_id: c?.k_id ?? '',
        order_index: c?.order ?? 0,
      };
    });

    return NextResponse.json(mapped);
  } catch (err: any) {
    console.error('Competencies error:', err);
    return NextResponse.json({ error: err?.message ?? 'Interner Fehler' }, { status: 500 });
  }
}
