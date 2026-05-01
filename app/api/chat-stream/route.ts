export const dynamic = 'force-dynamic';
export const maxDuration = 60;

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Nicht autorisiert' }), { status: 401 });
    }

    const body = await request.json();
    const { chat_id, message, assessment_id, history } = body ?? {};

    // Save user message
    if (chat_id && message) {
      try {
        await prisma.message.create({
          data: { chatId: chat_id, role: 'user', content: message },
        });
      } catch (e: any) {
        console.error('Save user message error:', e);
      }
    }

    // Fetch assessment context including question answers
    let assessmentContext = '';
    if (assessment_id) {
      try {
        const assessment = await prisma.assessment.findUnique({
          where: { id: assessment_id },
        });
        if (assessment) {
          const ratingsObj = assessment?.ratings as Record<string, any> ?? {};
          const ratingsStr = Object.entries(ratingsObj)
            ?.map(([k, v]: [string, any]) => `${k}: ${v}`)
            ?.join(', ') ?? '';
          assessmentContext = `\nAktuelle Einschätzung (quantitativ): ${ratingsStr}`;

          // Include question answers
          const qAnswers: string[] = [];
          const { data: questionData } = await supabase
            .from('questions')
            .select('*')
            .order('sort_no', { ascending: true });
          const questionTexts = (questionData ?? []).map((q: any) => q?.question_text ?? '');

          for (let i = 1; i <= 7; i++) {
            const answer = (assessment as any)?.[`q${i}`];
            if (answer && answer.trim()) {
              const questionText = questionTexts[i - 1] ?? `Frage ${i}`;
              qAnswers.push(`${questionText}: ${answer}`);
            }
          }
          if (qAnswers.length > 0) {
            assessmentContext += `\n\nFachfragen-Antworten (qualitativ – Berufswünsche, Erprobung, Voraussetzungen):\n${qAnswers.join('\n')}`;
          }

          if (assessment?.aiAnalysis) {
            assessmentContext += `\n\nBisherige KI-Analyse: ${assessment.aiAnalysis.slice(0, 2000)}`;
          }
        }
      } catch (e: any) {
        console.error('Fetch assessment context error:', e);
      }
    }

    // Fetch knowledge base (ALL entries, no limits)
    let luvContext = '';
    let handbuchContext = '';
    try {
      const [luvResult, handbuchResult] = await Promise.all([
        supabase.from('wissen_luv').select('*').limit(80),
        supabase.from('wissen_handbuch').select('*').order('category', { ascending: true }).limit(80),
      ]);

      // Structure LUV by category/type
      const luvEntries = luvResult?.data ?? [];
      if (luvEntries.length > 0) {
        const luvByCategory: Record<string, string[]> = {};
        for (const entry of luvEntries) {
          const cat = entry?.category ?? entry?.kategorie ?? entry?.type ?? 'Allgemein';
          if (!luvByCategory[cat]) luvByCategory[cat] = [];
          if (entry?.content) luvByCategory[cat].push(entry.content);
        }
        luvContext = Object.entries(luvByCategory)
          .map(([cat, items]) => `### ${cat}\n${items.join('\n').slice(0, 12000)}`)
          .join('\n\n');
      }

      // Structure Handbuch by category for systematic reference
      const handbuchEntries = handbuchResult?.data ?? [];
      if (handbuchEntries.length > 0) {
        const handbuchByCategory: Record<string, { topic: string; content: string }[]> = {};
        for (const entry of handbuchEntries) {
          const cat = entry?.category ?? entry?.kategorie ?? entry?.source_file ?? 'Allgemein';
          if (!handbuchByCategory[cat]) handbuchByCategory[cat] = [];
          handbuchByCategory[cat].push({
            topic: entry?.topic ?? entry?.source_file ?? '',
            content: entry?.content ?? '',
          });
        }
        handbuchContext = Object.entries(handbuchByCategory)
          .map(([cat, items]) => {
            const itemTexts = items
              .map((it) => it.topic ? `**${it.topic}:** ${it.content}` : it.content)
              .filter(Boolean)
              .join('\n')
              .slice(0, 12000);
            return `### ${cat}\n${itemTexts}`;
          })
          .join('\n\n');
      }
    } catch (e: any) {
      console.error('Knowledge fetch error:', e);
    }

    const systemPrompt = `Du bist Experte für Kompetenzdiagnostik, pädagogische Auswertung und Förderplanung im Bereich der beruflichen Rehabilitation von Jugendlichen und jungen Erwachsenen. Du hilfst Berater:innen bei der Interpretation und Nutzung von Kompetenzeinschätzungen.

Sprich immer von "Teilnehmende/r" oder "der/die Teilnehmende", niemals von "Klient".

WICHTIG: Dir liegen sowohl quantitative Bewertungen als auch qualitative Fachfragen-Antworten vor (z.B. Berufswünsche, Erprobungsergebnisse, fachliche Voraussetzungen). Beziehe BEIDE Datenquellen in deine Antworten ein. Die Fachfragen sind besonders relevant für die Auswahl passender Förderansätze.

Interpretiere die Skala wie folgt: +3 = deutlich ausgeprägte Stärke, +2 = Stärke, +1 = eher Stärke, 0 = durchschnittlich, -1 = eher Entwicklungsbereich, -2 = Entwicklungsbereich, -3 = deutlicher Entwicklungsbedarf.

Formuliere sachlich, wertschätzend und diagnostisch fundiert. Keine Diagnosen oder Bewertungen der Persönlichkeit.
${assessmentContext}${handbuchContext ? '\n\n## REFERENZ-HANDBUCH (systematisch nutzen!)\nDas folgende Handbuch ist deine zentrale Wissensgrundlage. Nutze es systematisch bei jeder Antwort. Es enthält Definitionen, Bewertungskriterien und Handlungsempfehlungen.\n\n' + handbuchContext : ''}${luvContext ? '\n\n## VORLAGEN (LUV)\n' + luvContext : ''}

Antworte immer auf Deutsch. Sei präzise und hilfreich.`;

    const chatHistory = (history ?? [])?.map((m: any) => ({
      role: m?.role ?? 'user',
      content: m?.content ?? '',
    })) ?? [];

    const messages = [
      { role: 'system', content: systemPrompt },
      ...chatHistory,
      { role: 'user', content: message ?? '' },
    ];

    const { callLlm } = await import('@/lib/llm');
    const llmResponse = await callLlm({ messages, stream: true, max_tokens: 3000 });

    if (!llmResponse.ok) {
      const errText = await llmResponse.text();
      console.error('Chat LLM error:', errText);
      return new Response(JSON.stringify({ error: errText || 'KI-Antwort fehlgeschlagen' }), { status: 500 });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = llmResponse.body?.getReader();
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        let buffer = '';
        let partialRead = '';
        let finalized = false;

        const finalize = async () => {
          if (finalized) return;
          finalized = true;
          if (chat_id && buffer) {
            try {
              await prisma.message.create({
                data: { chatId: chat_id, role: 'assistant', content: buffer },
              });
            } catch (e: any) {
              console.error('Save assistant message error:', e);
            }
          }
          const finalData = JSON.stringify({ status: 'completed', content: buffer });
          controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
        };

        try {
          while (true) {
            const { done, value } = await reader!.read();
            if (done) break;
            partialRead += decoder.decode(value, { stream: true });
            let lines = partialRead.split('\n');
            partialRead = lines.pop() ?? '';
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  await finalize();
                  return;
                }
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed?.choices?.[0]?.delta?.content ?? '';
                  if (content) {
                    buffer += content;
                    const chunkData = JSON.stringify({ status: 'streaming', content });
                    controller.enqueue(encoder.encode(`data: ${chunkData}\n\n`));
                  }
                } catch (e) {
                  // Skip
                }
              }
            }
          }
          await finalize();
        } catch (error) {
          console.error('Chat stream error:', error);
          const errData = JSON.stringify({ status: 'error', message: 'Stream-Fehler' });
          controller.enqueue(encoder.encode(`data: ${errData}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err: any) {
    console.error('Chat stream error:', err);
    return new Response(JSON.stringify({ error: err?.message ?? 'Chat-Fehler' }), { status: 500 });
  }
}
