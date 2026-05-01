'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  ClipboardCheck, ChevronLeft, ChevronRight, Save, Sparkles,
  ArrowLeft, Loader2, Info, CheckCircle2, HelpCircle, Pause
} from 'lucide-react';
import { toast } from 'sonner';

interface Competency {
  id: string;
  name: string;
  category: string;
  description: string | null;
  indicators: string | null;
  order_index: number | null;
}

interface Question {
  id: string;
  question: string;
  hint: string;
  order: number;
}

type AssessmentPhase = 'ratings' | 'questions';

const RATING_VALUES = [-3, -2, -1, 0, 1, 2, 3, 'X'] as const;
type RatingValue = typeof RATING_VALUES[number];

const RATING_COLORS: Record<string, string> = {
  '-3': 'bg-red-600 hover:bg-red-700 text-white',
  '-2': 'bg-orange-500 hover:bg-orange-600 text-white',
  '-1': 'bg-amber-500 hover:bg-amber-600 text-white',
  '0': 'bg-yellow-400 hover:bg-yellow-500 text-black',
  '1': 'bg-lime-500 hover:bg-lime-600 text-white',
  '2': 'bg-green-500 hover:bg-green-600 text-white',
  '3': 'bg-emerald-600 hover:bg-emerald-700 text-white',
  'X': 'bg-gray-400 hover:bg-gray-500 text-white',
};

const RATING_SELECTED: Record<string, string> = {
  '-3': 'bg-red-600 text-white ring-2 ring-red-800 ring-offset-2',
  '-2': 'bg-orange-500 text-white ring-2 ring-orange-700 ring-offset-2',
  '-1': 'bg-amber-500 text-white ring-2 ring-amber-700 ring-offset-2',
  '0': 'bg-yellow-400 text-black ring-2 ring-yellow-600 ring-offset-2',
  '1': 'bg-lime-500 text-white ring-2 ring-lime-700 ring-offset-2',
  '2': 'bg-green-500 text-white ring-2 ring-green-700 ring-offset-2',
  '3': 'bg-emerald-600 text-white ring-2 ring-emerald-800 ring-offset-2',
  'X': 'bg-gray-400 text-white ring-2 ring-gray-600 ring-offset-2',
};

const BAR_COLORS: Record<string, string> = {
  '-3': 'bg-red-600',
  '-2': 'bg-orange-500',
  '-1': 'bg-amber-500',
  '0': 'bg-yellow-400',
  '1': 'bg-lime-500',
  '2': 'bg-green-500',
  '3': 'bg-emerald-600',
  'X': 'bg-gray-300',
};

function getRatingBarWidth(val: RatingValue): number {
  if (val === 'X') return 0;
  return ((Number(val) + 3) / 6) * 100;
}

export function AssessmentClient() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams?.get('client_id') ?? '';
  const assessmentId = searchParams?.get('assessment_id') ?? '';
  const isEditMode = !!assessmentId;

  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [ratings, setRatings] = useState<Record<string, RatingValue>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [notes, setNotes] = useState('');
  const [phase, setPhase] = useState<AssessmentPhase>('ratings');
  const [existingAssessmentId, setExistingAssessmentId] = useState(assessmentId);
  const [resolvedClientId, setResolvedClientId] = useState(clientId);

  const fetchData = useCallback(async () => {
    try {
      const [compRes, questRes] = await Promise.all([
        fetch('/api/competencies'),
        fetch('/api/questions'),
      ]);
      let sortedComps: Competency[] = [];
      if (compRes.ok) {
        const data = await compRes.json();
        sortedComps = [...(data ?? [])].sort((a: Competency, b: Competency) => {
          if (a.category !== b.category) {
            const aFirst = (data ?? []).findIndex((c: Competency) => c.category === a.category);
            const bFirst = (data ?? []).findIndex((c: Competency) => c.category === b.category);
            return aFirst - bFirst;
          }
          return (a.order_index ?? 0) - (b.order_index ?? 0);
        });
        setCompetencies(sortedComps);
      } else {
        const errData = await compRes.json().catch(() => null);
        toast.error(errData?.error ?? 'Kompetenzen konnten nicht geladen werden');
      }
      if (questRes.ok) {
        const data = await questRes.json();
        setQuestions(data ?? []);
      } else {
        const errData = await questRes.json().catch(() => null);
        toast.error(errData?.error ?? 'Fachfragen konnten nicht geladen werden');
      }

      // If editing an existing assessment, load its data
      if (assessmentId && sortedComps.length > 0) {
        try {
          const aRes = await fetch(`/api/assessments/${assessmentId}`);
          if (aRes.ok) {
            const aData = await aRes.json();
            setResolvedClientId(aData?.clientId ?? clientId);

            // Restore ratings: convert name-based keys back to ID-based
            const storedRatings = aData?.ratings ?? {};
            const restoredRatings: Record<string, RatingValue> = {};
            for (const [key, val] of Object.entries(storedRatings)) {
              const comp = sortedComps.find((c: Competency) => c.name === key);
              if (comp) {
                restoredRatings[comp.id] = val as RatingValue;
              }
            }
            setRatings(restoredRatings);

            // Restore answers
            const restoredAnswers: Record<string, string> = {};
            for (let i = 1; i <= 7; i++) {
              const qVal = (aData as any)?.[`q${i}`];
              if (qVal) restoredAnswers[`q${i}`] = qVal;
            }
            setAnswers(restoredAnswers);

            // Restore notes
            if (aData?.notes) setNotes(aData.notes);

            // Restore position (phase & index)
            if (aData?.currentPhase === 'questions') {
              setPhase('questions');
            } else {
              setPhase('ratings');
            }
            setCurrentIndex(aData?.currentIndex ?? 0);
          }
        } catch (e: any) {
          console.error('Load assessment error:', e);
        }
      }
    } catch (err: any) {
      console.error('Fetch data error:', err);
      toast.error('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  }, [assessmentId, clientId]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
    }
  }, [status, fetchData]);

  const categories = useMemo(() => {
    const cats: string[] = [];
    (competencies ?? [])?.forEach((c: Competency) => {
      if (c?.category && !cats.includes(c.category)) {
        cats.push(c.category);
      }
    });
    return cats;
  }, [competencies]);

  const competenciesByCategory = useMemo(() => {
    const map: Record<string, Competency[]> = {};
    (competencies ?? [])?.forEach((c: Competency) => {
      const cat = c?.category ?? 'Sonstige';
      if (!map[cat]) map[cat] = [];
      map[cat].push(c);
    });
    return map;
  }, [competencies]);

  const currentCompetency = competencies?.[currentIndex] ?? null;
  const currentCategory = currentCompetency?.category ?? '';

  const handleRate = (value: RatingValue) => {
    if (!currentCompetency?.id) return;
    setRatings((prev) => ({ ...(prev ?? {}), [currentCompetency.id]: value }));
  };

  const hasQuestions = (questions?.length ?? 0) > 0;
  const isLastCompetency = currentIndex >= (competencies?.length ?? 0) - 1;

  const goNext = () => {
    if (isLastCompetency && hasQuestions) {
      // After last competency, seamlessly transition to questions
      setPhase('questions');
    } else if (currentIndex < (competencies?.length ?? 0) - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const goPrev = () => {
    if (phase === 'questions') {
      // From questions, go back to last competency
      setPhase('ratings');
      setCurrentIndex((competencies?.length ?? 1) - 1);
    } else if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const buildPayload = (isDraft: boolean) => {
    const namedRatings: Record<string, any> = {};
    Object.entries(ratings ?? {}).forEach(([id, val]: [string, any]) => {
      const comp = competencies?.find((c: Competency) => c?.id === id);
      namedRatings[comp?.name ?? id] = val;
    });
    return {
      client_id: resolvedClientId || clientId,
      ratings: namedRatings,
      notes,
      status: isDraft ? 'draft' : 'completed',
      currentPhase: phase,
      currentIndex: currentIndex,
      q1: answers['q1'] ?? null,
      q2: answers['q2'] ?? null,
      q3: answers['q3'] ?? null,
      q4: answers['q4'] ?? null,
      q5: answers['q5'] ?? null,
      q6: answers['q6'] ?? null,
      q7: answers['q7'] ?? null,
    };
  };

  const handleSaveDraft = async () => {
    const cid = resolvedClientId || clientId;
    if (!cid && !existingAssessmentId) {
      toast.error('Keine Teilnehmenden-ID angegeben');
      return;
    }
    setSavingDraft(true);
    try {
      const payload = buildPayload(true);
      let res: Response;
      if (existingAssessmentId) {
        res = await fetch(`/api/assessments/${existingAssessmentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/assessments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      if (res.ok) {
        const data = await res.json();
        if (!existingAssessmentId) {
          setExistingAssessmentId(data?.id ?? '');
        }
        toast.success('Zwischenstand gespeichert! Sie können jederzeit fortfahren.');
      } else {
        const errData = await res.json().catch(() => null);
        toast.error(errData?.error ?? 'Fehler beim Zwischenspeichern');
      }
    } catch (err: any) {
      console.error('Save draft error:', err);
      toast.error('Fehler beim Zwischenspeichern');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSave = async () => {
    const cid = resolvedClientId || clientId;
    if (!cid && !existingAssessmentId) {
      toast.error('Keine Teilnehmenden-ID angegeben');
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload(false);
      let res: Response;
      if (existingAssessmentId) {
        res = await fetch(`/api/assessments/${existingAssessmentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/assessments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      if (res.ok) {
        const data = await res.json();
        toast.success('Einschätzung gespeichert!');
        router.push(`/results/${data?.id ?? existingAssessmentId}`);
      } else {
        const errData = await res.json().catch(() => null);
        toast.error(errData?.error ?? 'Fehler beim Speichern');
      }
    } catch (err: any) {
      console.error('Save assessment error:', err);
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const ratedCount = Object.keys(ratings ?? {})?.length ?? 0;
  const totalCount = competencies?.length ?? 0;
  const allRated = totalCount > 0 && ratedCount === totalCount;

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-[1200px] mx-auto px-4 h-14 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground font-mono">Teilnehmende/r: {clientId}</span>
            <span className="text-xs text-muted-foreground">
              {phase === 'questions' ? 'Fachfragen' : `${ratedCount}/${totalCount} bewertet`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSaveDraft}
              loading={savingDraft}
              disabled={savingDraft || saving || ratedCount === 0}
              size="sm"
              variant="outline"
              title="Zwischenstand speichern und später fortfahren"
            >
              <Pause className="w-4 h-4 mr-1" /> Zwischenspeichern
            </Button>
            {phase === 'questions' ? (
              <Button
                onClick={handleSave}
                loading={saving}
                size="sm"
              >
                <Save className="w-4 h-4 mr-1" /> Abschließen
              </Button>
            ) : (
              <Button
                onClick={hasQuestions ? goNext : handleSave}
                loading={saving}
                disabled={ratedCount === 0 || (hasQuestions && !isLastCompetency)}
                size="sm"
                variant={hasQuestions ? 'default' : 'default'}
              >
                {hasQuestions ? (
                  isLastCompetency ? <><ChevronRight className="w-4 h-4 mr-1" /> Fachfragen</> : <><Save className="w-4 h-4 mr-1" /> Speichern</>
                ) : (
                  <><Save className="w-4 h-4 mr-1" /> Speichern</>
                )}
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Competency Assessment or Questions */}
          <div className="lg:col-span-2">
            {phase === 'questions' ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Title */}
                <div className="text-center mb-6">
                  <h2 className="text-xl md:text-2xl font-display font-bold tracking-tight">
                    Fachliche Basiskompetenzen /
                  </h2>
                  <h2 className="text-xl md:text-2xl font-display font-bold tracking-tight">
                    Ergebnisse der Erprobung in den Berufsfeldern
                  </h2>
                </div>

                {/* Questions Grid */}
                <div className="space-y-4">
                  {(questions ?? []).slice(0, 7).map((q: Question, idx: number) => {
                    const qKey = `q${idx + 1}`;
                    const charCount = (answers[qKey] ?? '').length;
                    const maxChars = 10000;
                    return (
                      <div key={q?.id ?? idx} className="border rounded-lg overflow-hidden">
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr]">
                          {/* Question (left) */}
                          <div className="bg-muted/30 border-b md:border-b-0 md:border-r p-4 flex flex-col justify-center">
                            <p className="text-sm font-medium">
                              Frage {idx + 1}
                            </p>
                            {q?.question && (
                              <p className="text-sm mt-1 text-foreground">
                                {q.question}
                              </p>
                            )}
                            {q?.hint && (
                              <p className="text-xs text-muted-foreground mt-2 italic">
                                {q.hint}
                              </p>
                            )}
                          </div>
                          {/* Answer (right) */}
                          <div className="relative">
                            <Textarea
                              placeholder="Geben Sie Ihre Antwort ein"
                              value={answers[qKey] ?? ''}
                              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                const val = e.target.value;
                                if (val.length <= maxChars) {
                                  setAnswers((prev) => ({ ...(prev ?? {}), [qKey]: val }));
                                }
                              }}
                              rows={5}
                              className="resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none h-full min-h-[120px]"
                              maxLength={maxChars}
                            />
                            <div className="absolute bottom-2 right-3 text-xs text-muted-foreground">
                              {charCount}/{maxChars}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Check-up Section */}
                <div className="mt-8 space-y-3">
                  <h3 className="text-lg font-display font-semibold flex items-center gap-2">
                    <span className="text-primary">🔍</span> Kurzer Check-up
                  </h3>
                  <p className="text-sm text-foreground">
                    Bevor wir zu den <strong>Analysen</strong> übergehen, nimm dir einen Moment Zeit für das Gesamtbild. Deine Antworten sind das Fundament der Analyse.
                  </p>
                  <ul className="text-sm space-y-1.5 list-disc list-inside">
                    <li>
                      <strong>Korrekturen gewünscht?</strong> Gehe mit dem Cursor zu den Antworten und editiere sie.
                    </li>
                    <li>
                      <strong>Noch unsicher?</strong> Klicke <em>noch nicht</em> auf den Abschluss-Button.
                    </li>
                    <li>
                      <strong>Pause gefällig?</strong> Klicke auf &quot;Zwischenspeichern&quot; und fahre später genau an dieser Stelle fort.
                    </li>
                  </ul>
                  <p className="text-sm font-semibold">
                    Komm einfach zurück, wenn du bereit für den nächsten Schritt bist!
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col items-center gap-3 mt-8">
                  <Button
                    onClick={handleSave}
                    loading={saving}
                    disabled={saving}
                    size="lg"
                    className="px-8"
                  >
                    Fragen abschließen
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goPrev}
                    className="text-muted-foreground"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Zurück zu Bewertungen
                  </Button>
                </div>
              </motion.div>
            ) : currentCompetency ? (
              <motion.div
                key={currentCompetency?.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Category Progress Bar */}
                <div className="mb-4">
                  <div className="flex gap-1">
                    {(categories ?? []).map((cat: string) => {
                      const catComps = competenciesByCategory?.[cat] ?? [];
                      const catRated = catComps.filter((c: Competency) => ratings?.[c?.id ?? ''] !== undefined).length;
                      const isCurrent = cat === currentCategory;
                      const isComplete = catRated === catComps.length && catComps.length > 0;
                      return (
                        <div key={cat} className="flex-1">
                          <div
                            className={`h-1.5 rounded-full transition-all ${
                              isCurrent
                                ? 'bg-primary'
                                : isComplete
                                  ? 'bg-emerald-500'
                                  : 'bg-muted'
                            }`}
                          />
                          <p className={`text-[10px] mt-1 text-center truncate ${
                            isCurrent ? 'text-primary font-semibold' : 'text-muted-foreground'
                          }`}>
                            {cat}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Card className="overflow-hidden">
                  {/* Category Header */}
                  <div className="bg-primary text-primary-foreground px-6 py-3">
                    <h3 className="font-display font-semibold text-center">
                      {currentCategory}
                    </h3>
                    <p className="text-xs text-center text-primary-foreground/70 mt-0.5">
                      {(() => {
                        const catComps = competenciesByCategory?.[currentCategory] ?? [];
                        const posInCat = catComps.findIndex((c: Competency) => c?.id === currentCompetency?.id) + 1;
                        return `Kompetenz ${posInCat} von ${catComps.length}`;
                      })()}
                    </p>
                  </div>

                  <CardContent className="p-6">
                    {/* Competency Name */}
                    <h2 className="text-xl font-display font-bold text-center mb-6">
                      {currentCompetency?.name ?? ''}
                    </h2>

                    {/* Description & Indicators */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="bg-muted/50 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                          <Info className="w-3 h-3" /> Beschreibung
                        </h4>
                        <p className="text-sm">
                          {currentCompetency?.description ?? 'Keine Beschreibung verfügbar'}
                        </p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Indikatoren
                        </h4>
                        {currentCompetency?.indicators ? (
                          <ul className="text-sm space-y-1 list-disc list-inside">
                            {currentCompetency.indicators
                              .split(/[\n;•\-]/)
                              .map((item: string) => item.trim())
                              .filter((item: string) => item.length > 0)
                              .map((item: string, idx: number) => (
                                <li key={idx}>{item}</li>
                              ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground">Keine Indikatoren verfügbar</p>
                        )}
                      </div>
                    </div>

                    {/* Rating Scale */}
                    <div className="flex flex-col items-center gap-4">
                      <p className="text-sm text-muted-foreground">Bewertung wählen:</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {RATING_VALUES?.map((val: RatingValue) => {
                          const isSelected = ratings?.[currentCompetency?.id ?? ''] === val;
                          const key = String(val);
                          return (
                            <button
                              key={key}
                              onClick={() => handleRate(val)}
                              className={`w-12 h-12 rounded-lg font-bold text-sm transition-all duration-150 ${
                                isSelected
                                  ? RATING_SELECTED[key] ?? ''
                                  : RATING_COLORS[key] ?? ''
                              }`}
                            >
                              {val === 'X' ? 'X' : val > 0 ? `+${val}` : String(val)}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex justify-between w-full max-w-md text-xs text-muted-foreground px-2">
                        <span>stark unterentwickelt</span>
                        <span>altersgerecht</span>
                        <span>stark überentwickelt</span>
                      </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center justify-between mt-8">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={goPrev}
                        disabled={currentIndex === 0}
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" /> Zurück
                      </Button>
                      <span className="text-sm text-muted-foreground font-mono">
                        {currentIndex + 1} / {totalCount}{hasQuestions ? ' + Fachfragen' : ''}
                      </span>
                      <Button
                        variant={isLastCompetency && hasQuestions ? 'default' : 'outline'}
                        size="sm"
                        onClick={goNext}
                        disabled={isLastCompetency && !hasQuestions}
                      >
                        {isLastCompetency && hasQuestions ? (
                          <>Weiter zu Fachfragen <ChevronRight className="w-4 h-4 ml-1" /></>
                        ) : (
                          <>Weiter <ChevronRight className="w-4 h-4 ml-1" /></>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Notes */}
                <Card className="mt-4">
                  <CardContent className="pt-4">
                    <Textarea
                      placeholder="Anmerkungen zur Einschätzung..."
                      value={notes}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <Card>
                <CardContent className="py-16 text-center">
                  <p className="text-muted-foreground">Keine Kompetenzen geladen</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Results Overview */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <img src="/logo.png" alt="Logo" className="w-5 h-5 object-contain" />
                  Ergebnisübersicht
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[calc(100vh-180px)] overflow-y-auto">
                {(categories ?? [])?.map((cat: string) => (
                  <div key={cat}>
                    <div className="bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-md mb-2">
                      {cat}
                    </div>
                    <div className="space-y-1.5">
                      {(competenciesByCategory?.[cat] ?? [])?.map((comp: Competency) => {
                        const rating = ratings?.[comp?.id ?? ''];
                        const hasRating = rating !== undefined;
                        return (
                          <button
                            key={comp?.id}
                            onClick={() => {
                              const idx = competencies?.findIndex((c: Competency) => c?.id === comp?.id) ?? -1;
                              if (idx >= 0) setCurrentIndex(idx);
                            }}
                            className={`w-full flex items-center gap-2 text-left px-2 py-1.5 rounded text-xs hover:bg-muted/50 transition-colors ${
                              comp?.id === currentCompetency?.id ? 'bg-muted' : ''
                            }`}
                          >
                            <span className="flex-1 truncate">{comp?.name ?? ''}</span>
                            {hasRating ? (
                              <div className="flex items-center gap-1 min-w-[60px]">
                                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${BAR_COLORS[String(rating)] ?? 'bg-gray-300'}`}
                                    style={{ width: `${rating === 'X' ? 100 : getRatingBarWidth(rating)}%` }}
                                  />
                                </div>
                                <span className="font-mono text-[10px] min-w-[20px] text-right">
                                  {rating === 'X' ? 'X' : rating > 0 ? `+${rating}` : String(rating)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">—</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Status & Save */}
                <div className="pt-4 border-t space-y-2">
                  {phase === 'questions' && (
                    <div className="bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-md mb-2 flex items-center gap-1">
                      <HelpCircle className="w-3 h-3" /> Fachfragen
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {phase === 'questions'
                      ? 'Beantworten Sie die Fachfragen und schließen Sie die Einschätzung ab.'
                      : allRated
                        ? hasQuestions
                          ? 'Alle Kompetenzen bewertet. Klicken Sie „Weiter zu Fachfragen".'
                          : 'Alle Kompetenzen bewertet. Sie können die Einschätzung speichern.'
                        : `${ratedCount}/${totalCount} Kompetenzen bewertet.`}
                  </p>
                  {phase === 'questions' && (
                    <Button
                      className="w-full"
                      onClick={handleSave}
                      loading={saving}
                    >
                      <Save className="w-4 h-4 mr-1" />
                      Einschätzung speichern
                    </Button>
                  )}
                  {phase === 'ratings' && !hasQuestions && (
                    <Button
                      className="w-full"
                      onClick={handleSave}
                      loading={saving}
                      disabled={ratedCount === 0}
                    >
                      <Save className="w-4 h-4 mr-1" />
                      Einschätzung speichern
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
