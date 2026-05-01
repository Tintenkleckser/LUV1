export const dynamic = 'force-dynamic';
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const fallbackSuggestions = [
  'Welche Kompetenzbereiche sollten zuerst bearbeitet werden?',
  'Welche Beobachtungen wären für die nächste Einschätzung besonders wichtig?',
  'Wie lässt sich die Einschätzung wertschätzend zusammenfassen?',
];

function parseSuggestions(raw: string) {
  try {
    const parsed = JSON.parse(raw);
    const suggestions = Array.isArray(parsed) ? parsed : parsed?.suggestions;
    if (Array.isArray(suggestions)) {
      return suggestions
        .map((item) => String(item ?? '').trim())
        .filter(Boolean)
        .slice(0, 3);
    }
  } catch {
    // fall through to line-based parsing
  }

  return raw
    .split('\n')
    .map((line) => line.replace(/^\s*[-*\d.)]+\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 3);
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ suggestions: fallbackSuggestions }, { status: 401 });
    }

    const body = await request.json();
    const assistantResponse = String(body?.assistant_response ?? '').trim();
    const recentUserMessage = String(body?.recent_user_message ?? '').trim();

    if (!assistantResponse) {
      return NextResponse.json({ suggestions: fallbackSuggestions });
    }

    const { callLlm } = await import('@/lib/llm');
    const llmResponse = await callLlm({
      stream: false,
      max_tokens: 220,
      messages: [
        {
          role: 'system',
          content: `Du erzeugst genau drei kurze Folgefragen für einen professionellen Chat zur pädagogischen Kompetenzeinschätzung.

Regeln:
- Antworte ausschließlich als JSON: {"suggestions":["Frage 1","Frage 2","Frage 3"]}
- Jede Frage ist konkret, deutsch, hilfreich und höchstens 120 Zeichen lang.
- Keine Nummerierung, keine Erklärung, kein Markdown.
- Die Fragen sollen wahrscheinlich das sein, was der User nach der letzten KI-Antwort als Nächstes fragen könnte.`,
        },
        {
          role: 'user',
          content: `Letzte Nutzerfrage:
${recentUserMessage || '(nicht angegeben)'}

Letzte KI-Antwort:
${assistantResponse.slice(0, 5000)}`,
        },
      ],
    });

    if (!llmResponse.ok) {
      return NextResponse.json({ suggestions: fallbackSuggestions });
    }

    const data = await llmResponse.json().catch(() => null);
    const raw = data?.choices?.[0]?.message?.content ?? '';
    const suggestions = parseSuggestions(raw);

    return NextResponse.json({
      suggestions: suggestions.length === 3 ? suggestions : fallbackSuggestions,
    });
  } catch (err: any) {
    console.error('Followup suggestions error:', err);
    return NextResponse.json({ suggestions: fallbackSuggestions });
  }
}
