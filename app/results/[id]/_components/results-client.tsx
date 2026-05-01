'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft, Sparkles, MessageSquare, Table2, Target,
  Lightbulb, Loader2, Pencil
} from 'lucide-react';
import { toast } from 'sonner';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { ExportButtons } from '@/components/export-buttons';

interface ResultsClientProps {
  assessmentId: string;
}

export function ResultsClient({ assessmentId }: ResultsClientProps) {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [assessment, setAssessment] = useState<any>(null);
  const [competencies, setCompetencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [analysisText, setAnalysisText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisType, setAnalysisType] = useState('');
  const analysisRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const [assessRes, compRes] = await Promise.all([
        fetch(`/api/assessments/${assessmentId}`),
        fetch('/api/competencies'),
      ]);
      if (assessRes.ok) {
        const aData = await assessRes.json();
        setAssessment(aData);
        if (aData?.aiAnalysis) setAnalysisText(aData.aiAnalysis);
      }
      if (compRes.ok) {
        const cData = await compRes.json();
        setCompetencies(cData ?? []);
      }
    } catch (err: any) {
      console.error('Fetch results error:', err);
      toast.error('Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    if (status === 'authenticated') fetchData();
  }, [status, fetchData]);

  const startAnalysis = async (type: string) => {
    setAnalyzing(true);
    setAnalysisType(type);
    setAnalysisText('');
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessment_id: assessmentId,
          ratings: assessment?.ratings ?? {},
          competencies,
          analysis_type: type,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        toast.error(errData?.error ?? 'KI-Analyse fehlgeschlagen');
        setAnalyzing(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let partialRead = '';

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;
        partialRead += decoder.decode(value, { stream: true });
        let lines = partialRead.split('\n');
        partialRead = lines.pop() ?? '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (parsed?.status === 'streaming') {
                setAnalysisText((prev) => (prev ?? '') + (parsed?.content ?? ''));
              } else if (parsed?.status === 'completed') {
                setAnalysisText(parsed?.content ?? '');
                setAnalyzing(false);
                return;
              } else if (parsed?.status === 'error') {
                toast.error(parsed?.message ?? 'Fehler');
                setAnalyzing(false);
                return;
              }
            } catch (e) {
              // skip
            }
          }
        }
      }
      setAnalyzing(false);
    } catch (err: any) {
      console.error('Analysis error:', err);
      toast.error('KI-Analyse fehlgeschlagen');
      setAnalyzing(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-[1200px] mx-auto px-4 h-14 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
          </Button>
          <span className="text-sm font-mono text-muted-foreground">
            Teilnehmende/r: {assessment?.client?.clientCode ?? assessment?.clientId ?? ''}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/assessment/new?assessment_id=${assessmentId}&client_id=${assessment?.clientId ?? ''}`)}
              title="Einschätzung bearbeiten"
            >
              <Pencil className="w-4 h-4 mr-1" /> Bearbeiten
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/chat/${assessmentId}`)}
            >
              <MessageSquare className="w-4 h-4 mr-1" /> Chat
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-4 py-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-2xl font-display font-bold tracking-tight mb-1">
            KI-Auswertung
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            Einschätzung vom {assessment?.createdAt ? new Date(assessment.createdAt).toLocaleDateString('de-DE') : ''}
          </p>
        </motion.div>

        <div className="max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                KI-Auswertung
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Button
                  variant={analysisType === 'strengths_weaknesses' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => startAnalysis('strengths_weaknesses')}
                  disabled={analyzing}
                >
                  <Target className="w-4 h-4 mr-1" /> Stärken-Schwächen
                </Button>
                <Button
                  variant={analysisType === 'results_table' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => startAnalysis('results_table')}
                  disabled={analyzing}
                >
                  <Table2 className="w-4 h-4 mr-1" /> Verbalisierung
                </Button>
                <Button
                  variant={analysisType === 'recommendations' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => startAnalysis('recommendations')}
                  disabled={analyzing}
                >
                  <Lightbulb className="w-4 h-4 mr-1" /> Förderansätze
                </Button>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => startAnalysis('full')}
                disabled={analyzing}
              >
                <Sparkles className="w-4 h-4 mr-1" />
                {analyzing ? 'Analysiere...' : 'Vollständige Analyse'}
              </Button>

              {/* Analysis Output */}
              <div ref={analysisRef} className="relative">
                {analyzing && (
                  <div className="flex items-center gap-2 text-sm text-primary mb-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>KI analysiert...</span>
                  </div>
                )}
                {analysisText ? (
                  <div>
                    <div className="bg-muted/50 rounded-lg p-4 max-h-[70vh] overflow-y-auto">
                      <MarkdownRenderer content={analysisText} />
                    </div>
                    {!analyzing && (
                      <ExportButtons
                        content={analysisText}
                        filenameBase={`Kompetenzanalyse_${assessment?.client?.clientCode ?? assessmentId}`}
                      />
                    )}
                  </div>
                ) : !analyzing ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Wählen Sie eine Analyse-Art, um die KI-Auswertung zu starten</p>
                  </div>
                ) : null}
              </div>

              {/* Chat Link */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(`/chat/${assessmentId}`)}
              >
                <MessageSquare className="w-4 h-4 mr-1" />
                Rückfragen im Chat stellen
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
