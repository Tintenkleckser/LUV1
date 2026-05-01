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

function cleanSuggestion(value: unknown) {
  const text = String(value ?? '')
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return '';
  if (text.includes('{') || text.includes('}') || text.includes('[') || text.includes(']')) return '';
  if (/suggestions|python|```|def |import |console\.log|function\s/i.test(text)) return '';
  if (text.length > 160) return '';

  return text.endsWith('?') ? text : `${text}?`;
}

function uniqueSuggestions(items: unknown[]) {
  const seen = new Set<string>();
  const suggestions: string[] = [];

  for (const item of items) {
    const clean = cleanSuggestion(item);
    const key = clean.toLowerCase();
    if (clean && !seen.has(key)) {
      seen.add(key);
      suggestions.push(clean);
    }
    if (suggestions.length === 3) break;
  }

  return suggestions;
}

function parseSuggestions(raw: string) {
  const text = raw
    .replace(/```(?:json)?/gi, '')
    .replace(/```/g, '')
    .trim();

  const candidates = [text];
  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch) candidates.push(objectMatch[0]);
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) candidates.push(arrayMatch[0]);

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      const suggestions = Array.isArray(parsed) ? parsed : parsed?.suggestions;
      if (Array.isArray(suggestions)) {
        const clean = uniqueSuggestions(suggestions);
        if (clean.length === 3) return clean;
      }
    } catch {
      // try next candidate
    }
  }

  try {
    const parsedTwice = JSON.parse(JSON.parse(text));
    const suggestions = Array.isArray(parsedTwice) ? parsedTwice : parsedTwice?.suggestions;
    if (Array.isArray(suggestions)) {
      const clean = uniqueSuggestions(suggestions);
      if (clean.length === 3) return clean;
    }
  } catch {
    // fall through to line-based parsing
  }

  return uniqueSuggestions(text
    .split('\n')
    .map((line) => line.replace(/^\s*[-*\d.)]+\s*/, '').trim())
    .filter(Boolean));
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
- Kein Code, kein Python, keine technischen Beispiele.
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
