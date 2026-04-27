export const dynamic = 'force-dynamic';

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
    const { assessment_id, ratings, competencies, analysis_type } = body ?? {};

    // Fetch assessment with question answers from database
    let questionsContext = '';
    if (assessment_id) {
      try {
        const assessment = await prisma.assessment.findUnique({
          where: { id: assessment_id },
        });
        if (assessment) {
          const qAnswers: string[] = [];
          // Fetch question texts from Supabase
          const { data: questionData } = await supabase
            .from('questions')
            .select('*')
            .order('sort_no', { ascending: true });
          const questionTexts = (questionData ?? []).map((q: any) => q?.question_text ?? '');

          for (let i = 1; i <= 7; i++) {
            const answer = (assessment as any)?.[`q${i}`];
            if (answer && answer.trim()) {
              const questionText = questionTexts[i - 1] ?? `Frage ${i}`;
              qAnswers.push(`**${questionText}**\nAntwort: ${answer}`);
            }
          }
          if (qAnswers.length > 0) {
            questionsContext = qAnswers.join('\n\n');
          }
        }
      } catch (e: any) {
        console.error('Fetch assessment questions error:', e);
      }
    }

    // Fetch knowledge base from Supabase (ALL entries, no limits)
    let luvContext = '';
    let handbuchContext = '';
    try {
      const [luvResult, handbuchResult] = await Promise.all([
        supabase.from('wissen_luv').select('*'),
        supabase.from('wissen_handbuch').select('*').order('category', { ascending: true }),
      ]);

      // Structure LUV by category/type
      const luvEntries = luvResult?.data ?? [];
      if (luvEntries.length > 0) {
        const luvByCategory: Record<string, string[]> = {};
        for (const entry of luvEntries) {
          const cat = entry?.category ?? entry?.type ?? 'Allgemein';
          if (!luvByCategory[cat]) luvByCategory[cat] = [];
          if (entry?.content) luvByCategory[cat].push(entry.content);
        }
        luvContext = Object.entries(luvByCategory)
          .map(([cat, items]) => `### ${cat}\n${items.join('\n')}`)
          .join('\n\n');
      }

      // Structure Handbuch by category for systematic reference
      const handbuchEntries = handbuchResult?.data ?? [];
      if (handbuchEntries.length > 0) {
        const handbuchByCategory: Record<string, { topic: string; content: string }[]> = {};
        for (const entry of handbuchEntries) {
          const cat = entry?.category ?? 'Allgemein';
          if (!handbuchByCategory[cat]) handbuchByCategory[cat] = [];
          handbuchByCategory[cat].push({
            topic: entry?.topic ?? '',
            content: entry?.content ?? '',
          });
        }
        handbuchContext = Object.entries(handbuchByCategory)
          .map(([cat, items]) => {
            const itemTexts = items
              .map((it) => it.topic ? `**${it.topic}:** ${it.content}` : it.content)
              .filter(Boolean)
              .join('\n');
            return `### ${cat}\n${itemTexts}`;
          })
          .join('\n\n');
      }
    } catch (e: any) {
      console.error('Knowledge base fetch error:', e);
    }

    // Build ratings summary
    const ratingSummary = Object.entries(ratings ?? {})?.map(([key, val]: [string, any]) => {
      return `${key}: ${val === 'X' ? 'nicht bewertet' : val}`;
    })?.join('\n') ?? '';

    // Build full data context (ratings + questions)
    let fullDataContext = `## Kompetenzeinschätzungen (quantitativ)\n${ratingSummary}`;
    if (questionsContext) {
      fullDataContext += `\n\n## Fachfragen – Fachliche Basiskompetenzen / Erprobung in Berufsfeldern (qualitativ)\n${questionsContext}`;
    }

    // Base system context — shared across all analysis types
    let systemContext = `Antworte immer auf Deutsch. Nutze ausschließlich die vorliegenden Daten. Erfinde keine zusätzlichen Informationen. Formuliere präzise und verständlich. Sprich von "Teilnehmende/r" oder "der/die Teilnehmende", niemals von "Klient".`;

    if (handbuchContext) systemContext += `\n\n## REFERENZ-HANDBUCH (WICHTIG – systematisch nutzen!)\nDas folgende Handbuch ist deine zentrale Wissensgrundlage. Du MUSST es systematisch lesen und bei jeder Analyse heranziehen. Es enthält Definitionen, Bewertungskriterien und Handlungsempfehlungen für die einzelnen Kompetenzbereiche. Ordne die Bewertungen den jeweiligen Handbuch-Kategorien zu und verwende die dort beschriebenen Kriterien und Empfehlungen.\n\n${handbuchContext}`;
    if (luvContext) systemContext += `\n\n## VORLAGEN (LUV)\nDie folgenden Vorlagen dienen als Orientierung für die Struktur und Formulierung deiner Analyse.\n\n${luvContext}`;

    let systemPrompt = '';
    let userPrompt = '';

    if (analysis_type === 'strengths_weaknesses') {
      // Prompt 1: Stärken-Schwächen-Profil
      systemPrompt = `Du bist Experte für Kompetenzdiagnostik und pädagogische bzw. psychologische Auswertung von Einschätzungsdaten.

Du erhältst:
- Eine Tabelle mit Kompetenzkategorien, Merkmalen, Definitionen, Indikatoren und Skalenstufen (-3 bis +3).
- Die Einschätzungsergebnisse einer teilnehmenden Person zu den einzelnen Merkmalen auf dieser Skala.

Deine Aufgabe ist es, aus den Ergebnissen ein prägnantes Stärken-Schwächen-Profil der teilnehmenden Person zu erstellen.

Arbeite dabei nach folgenden Regeln:
Interpretiere die Skala wie folgt:
+3 = deutlich ausgeprägte Stärke
+2 = Stärke
+1 = eher Stärke
0 = durchschnittliche Ausprägung
-1 = eher Entwicklungsbereich
-2 = Entwicklungsbereich
-3 = deutlicher Entwicklungsbedarf

Identifiziere:
- die wichtigsten Stärken der teilnehmenden Person
- durchschnittliche Ausprägungen
- die wichtigsten Entwicklungsfelder (Schwächen)
- mögliche Muster innerhalb der Kompetenzbereiche

Nutze dabei die in der Tabelle enthaltenen Definitionen und Indikatoren der Merkmale, um die Ergebnisse verständlich zu interpretieren.
Formuliere das Profil sachlich, wertschätzend und diagnostisch fundiert.

Struktur der Ausgabe:
1. Kurzbeschreibung des Gesamtprofils (3–4 Sätze)
2. Zentrale Stärken (Aufzählung mit kurzer Erläuterung)
3. Entwicklungsfelder (Aufzählung mit kurzer Erläuterung)
4. Auffällige Muster oder Zusammenhänge zwischen Kompetenzen (optional)

${systemContext}`;

      userPrompt = `Erstelle ein Stärken-Schwächen-Profil für die folgende Kompetenzeinschätzung:\n\n${fullDataContext}`;

    } else if (analysis_type === 'results_table') {
      // Prompt 2: Verbalisierung und Zusammenfassung Merkmalsausprägung in Kompetenzkategorien
      systemPrompt = `Du bist Experte für Kompetenzdiagnostik und die verständliche Aufbereitung diagnostischer Ergebnisse.

Du erhältst:
- In der Tabelle Kompetenzkategorien mit mehreren zugeordneten Merkmalen.
- Zu jedem Merkmal eine Definition und Indikatoren.
- Die Einschätzungswerte einer teilnehmenden Person auf einer Skala von -3 bis +3.

Deine Aufgabe ist es, die Ergebnisse innerhalb der jeweiligen Kompetenzkategorien in wenigen prägnanten Sätzen zusammenzufassen.

Vorgehen:
1. Analysiere die Werte der einzelnen Merkmale.
2. Nutze die Definitionen und Indikatoren, um die Ergebnisse inhaltlich zu interpretieren.
3. Formuliere eine kurze verbale Zusammenfassung der Kompetenzen der teilnehmenden Person im Bereich der jeweiligen Kategorie.

Interpretation der Skala:
+3 = stark ausgeprägt
+2 = ausgeprägt
+1 = eher vorhanden
0 = durchschnittlich
-1 = eher schwach ausgeprägt
-2 = schwach ausgeprägt
-3 = deutlich schwach ausgeprägt

Anforderungen an die Zusammenfassung:
- 3–5 Sätze pro Kompetenzkategorie
- klare, verständliche Sprache
- Fokus auf das Gesamtbild innerhalb der Kategorie
- Stärken und mögliche Entwicklungsbereiche erwähnen

Wichtig:
- Wiederhole nicht einfach die Zahlenwerte.
- Verdichte die Informationen zu einer inhaltlichen Interpretation.
- Nutze die Beschreibungen der Merkmale als Grundlage für die Formulierung.

${systemContext}`;

      userPrompt = `Erstelle eine verbalisierte Zusammenfassung der Merkmalsausprägungen nach Kompetenzkategorien für die folgende Einschätzung:\n\n${fullDataContext}`;

    } else if (analysis_type === 'recommendations') {
      // Prompt 3: Vorschläge Förderansätze
      systemPrompt = `Du bist Experte für Kompetenzentwicklung, Diagnostik und Förderplanung im Bereich der beruflichen Rehabilitation von Jugendlichen und jungen Erwachsenen.

Du erhältst:
- Die Einschätzungsergebnisse einer teilnehmenden Person zu mehreren Kompetenzmerkmalen (Skala -3 bis +3).
- Die Beschreibung der Kompetenzkategorien, zugehörigen Merkmale, Definitionen und Indikatoren.

Deine Aufgabe ist es, auf Grundlage der Ergebnisse geeignete Förderansätze für diese teilnehmende Person vorzuschlagen.

Arbeite dabei nach folgenden Prinzipien:
- Konzentriere dich vor allem auf Merkmale mit Werten von -1, -2 oder -3 (Entwicklungsbereiche).
- Berücksichtige vorhandene Stärken (+2 / +3), die für die Förderung genutzt werden können.
- Leite konkrete und realistische Förderansätze aus den Kompetenzbeschreibungen und Indikatoren ab.

Struktur der Ausgabe:
1. Kurze Einordnung der wichtigsten Entwicklungsbereiche (2–3 Sätze)
2. Förderansätze nach Kompetenzbereichen:
   - **Kompetenzbereich:** [Name]
   - **Entwicklungsziel:** kurze Beschreibung der zu entwickelnden Kompetenz
   - **Förderansatz 1:** konkrete Maßnahme oder Lernstrategie
   - **Förderansatz 2:** konkrete Maßnahme oder Lernstrategie
   - **Förderansatz 3:** konkrete Maßnahme oder Lernstrategie
3. Optional: Hinweise zur Nutzung vorhandener Stärken zur Unterstützung der Entwicklung.

Wichtig:
- Formuliere praxisnahe und umsetzbare Förderideen.
- Bleibe innerhalb der Informationen aus der Kompetenzbeschreibung.
- Keine Diagnosen oder Bewertungen der Persönlichkeit.

${systemContext}`;

      userPrompt = `Schlage Förderansätze vor, basierend auf folgenden Einschätzungsdaten:\n\n${fullDataContext}`;

    } else {
      // Vollständige Analyse: Kombination aller drei Perspektiven
      systemPrompt = `Du bist Experte für Kompetenzdiagnostik, pädagogische Auswertung und Förderplanung im Bereich der beruflichen Rehabilitation von Jugendlichen und jungen Erwachsenen.

Du erhältst die Einschätzungsergebnisse einer teilnehmenden Person. Erstelle eine vollständige Analyse mit folgenden drei Teilen:

**Teil 1 – Stärken-Schwächen-Profil:**
Interpretiere die Skala: +3 = deutlich ausgeprägte Stärke, +2 = Stärke, +1 = eher Stärke, 0 = durchschnittlich, -1 = eher Entwicklungsbereich, -2 = Entwicklungsbereich, -3 = deutlicher Entwicklungsbedarf.
Erstelle: Kurzbeschreibung des Gesamtprofils (3–4 Sätze), zentrale Stärken, Entwicklungsfelder, auffällige Muster.

**Teil 2 – Verbalisierung nach Kompetenzkategorien:**
Fasse die Ergebnisse innerhalb jeder Kompetenzkategorie in 3–5 prägnanten Sätzen zusammen. Wiederhole nicht die Zahlenwerte, sondern verdichte zu einer inhaltlichen Interpretation. Nutze Definitionen und Indikatoren der Merkmale.

**Teil 3 – Förderansätze:**
Konzentriere dich auf Merkmale mit Werten -1 bis -3. Berücksichtige vorhandene Stärken (+2/+3). Strukturiere nach Kompetenzbereichen mit Entwicklungsziel und konkreten Förderansätzen. Formuliere praxisnah und umsetzbar. Keine Diagnosen oder Persönlichkeitsbewertungen.

Formuliere sachlich, wertschätzend und diagnostisch fundiert.

${systemContext}`;

      userPrompt = `Erstelle eine vollständige Kompetenzanalyse (Stärken-Schwächen-Profil, Verbalisierung nach Kategorien, Förderansätze) für die folgende Einschätzung:\n\n${fullDataContext}`;
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const llmResponse = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages,
        stream: true,
        max_tokens: 4000,
      }),
    });

    if (!llmResponse.ok) {
      const errText = await llmResponse.text();
      console.error('LLM API error:', errText);
      return new Response(JSON.stringify({ error: 'KI-Analyse fehlgeschlagen' }), { status: 500 });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = llmResponse.body?.getReader();
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        let buffer = '';
        let partialRead = '';

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
                  if (assessment_id && buffer) {
                    try {
                      await prisma.assessment.update({
                        where: { id: assessment_id },
                        data: { aiAnalysis: buffer },
                      });
                    } catch (e: any) {
                      console.error('Save analysis error:', e);
                    }
                  }
                  const finalData = JSON.stringify({ status: 'completed', content: buffer });
                  controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
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
                  // Skip invalid
                }
              }
            }
          }
        } catch (error) {
          console.error('Stream error:', error);
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
    console.error('Analyze error:', err);
    return new Response(JSON.stringify({ error: 'Analyse-Fehler' }), { status: 500 });
  }
}
