'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft, Sparkles, MessageSquare, Table2, Target,
  Lightbulb, Loader2, Pencil, Send, Bot, User
} from 'lucide-react';
import { toast } from 'sonner';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { ExportButtons } from '@/components/export-buttons';

interface ResultsClientProps {
  assessmentId: string;
}

interface Message {
  id?: string;
  role: string;
  content: string;
}

interface ChatSummary {
  id: string;
  title: string;
  lastMessage?: string | null;
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
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const analysisRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollChatToBottom = () => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollChatToBottom();
  }, [messages, streamingContent]);

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

  const loadChat = async (id: string) => {
    setChatId(id);
    setStreamingContent('');
    setSending(false);
    try {
      const msgsRes = await fetch(`/api/messages?chat_id=${id}`);
      if (msgsRes.ok) {
        const msgsData = await msgsRes.json();
        setMessages(msgsData ?? []);
      }
    } catch (err: any) {
      console.error('Load chat error:', err);
      toast.error('Chatverlauf konnte nicht geladen werden');
    }
  };

  const initChat = useCallback(async () => {
    try {
      const existingRes = await fetch(`/api/chats?assessment_id=${assessmentId}`);
      if (existingRes.ok) {
        const existingChats = await existingRes.json();
        setChats(existingChats ?? []);
        if ((existingChats?.length ?? 0) > 0) {
          await loadChat(existingChats[0]?.id);
          return;
        }
      }

      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessment_id: assessmentId,
          title: 'Kompetenzeinschätzung nach LuV - Chat',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setChatId(data?.id ?? null);
        setChats((prev) => [data, ...(prev ?? [])]);
      }
    } catch (err: any) {
      console.error('Init chat error:', err);
    }
  }, [assessmentId]);

  useEffect(() => {
    if (status === 'authenticated') initChat();
  }, [status, initChat]);

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

  const sendMessage = async (preset?: string) => {
    const userMsg = (preset ?? input).trim();
    if (!userMsg || sending) return;
    setInput('');
    setSending(true);
    setStreamingContent('');

    const newUserMsg: Message = { role: 'user', content: userMsg };
    setMessages((prev) => [...(prev ?? []), newUserMsg]);

    try {
      const res = await fetch('/api/chat-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message: userMsg,
          assessment_id: assessmentId,
          history: (messages ?? []).slice(-10).map((m: Message) => ({
            role: m?.role ?? 'user',
            content: m?.content ?? '',
          })),
        }),
      });

      if (!res.ok) {
        toast.error('Nachricht konnte nicht gesendet werden');
        setSending(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let partialRead = '';
      let fullContent = '';

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;
        partialRead += decoder.decode(value, { stream: true });
        const lines = partialRead.split('\n');
        partialRead = lines.pop() ?? '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (parsed?.status === 'streaming') {
                fullContent += parsed?.content ?? '';
                setStreamingContent(fullContent);
              } else if (parsed?.status === 'completed') {
                const assistantMsg: Message = { role: 'assistant', content: parsed?.content ?? fullContent };
                setMessages((prev) => [...(prev ?? []), assistantMsg]);
                setChats((prev) => (prev ?? []).map((chat) => (
                  chat.id === chatId ? { ...chat, lastMessage: assistantMsg.content.slice(0, 240) } : chat
                )));
                setStreamingContent('');
                setSending(false);
                return;
              } else if (parsed?.status === 'error') {
                toast.error(parsed?.message ?? 'Fehler');
                setSending(false);
                return;
              }
            } catch (e) {
              // skip
            }
          }
        }
      }

      if (fullContent) {
        setMessages((prev) => [...(prev ?? []), { role: 'assistant', content: fullContent }]);
        setChats((prev) => (prev ?? []).map((chat) => (
          chat.id === chatId ? { ...chat, lastMessage: fullContent.slice(0, 240) } : chat
        )));
        setStreamingContent('');
      }
      setSending(false);
    } catch (err: any) {
      console.error('Send message error:', err);
      toast.error('Fehler beim Senden');
      setSending(false);
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

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-4 items-start">
          <Card className="min-w-0">
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
                    <div className="bg-muted/50 rounded-lg p-4">
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
            </CardContent>
          </Card>

          <Card className="min-w-0 xl:sticky xl:top-20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Nachfragen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start text-left h-auto whitespace-normal"
                  disabled={sending}
                  onClick={() => sendMessage('Bitte erläutere die wichtigsten Befunde dieser Auswertung noch einmal in einfacher, praxisnaher Sprache.')}
                >
                  Befunde erläutern
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start text-left h-auto whitespace-normal"
                  disabled={sending}
                  onClick={() => sendMessage('Welche nächsten Schritte und Fördermaßnahmen sind auf Basis dieser Einschätzung besonders sinnvoll?')}
                >
                  Nächste Schritte
                </Button>
              </div>

              <div className="rounded-lg border bg-background/70">
                <div className="border-b px-3 py-2">
                  <div className="text-xs font-semibold text-muted-foreground">Bisherige Chatverläufe</div>
                  <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                    {(chats ?? []).map((chat) => (
                      <button
                        key={chat.id}
                        onClick={() => loadChat(chat.id)}
                        className={`min-w-[180px] max-w-[220px] rounded-md border px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted/60 ${
                          chat.id === chatId ? 'bg-primary/10 border-primary/30' : 'bg-background'
                        }`}
                      >
                        <div className="font-medium truncate">{chat.title || 'Chatverlauf'}</div>
                        <div className="text-muted-foreground truncate">
                          {chat.lastMessage || 'Noch keine gespeicherte Antwort'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-[52vh] min-h-[360px] overflow-y-auto overscroll-contain px-3 py-3 space-y-3">
                  {(messages?.length ?? 0) === 0 && !streamingContent && (
                    <div className="text-center py-10">
                      <Sparkles className="w-10 h-10 text-primary/20 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Stellen Sie Rückfragen zur Auswertung, ohne den Text zu verlassen.
                      </p>
                    </div>
                  )}

                  {(messages ?? []).map((msg: Message, idx: number) => (
                    <motion.div
                      key={msg?.id ?? idx}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-2 ${msg?.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg?.role !== 'user' && (
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Bot className="w-3.5 h-3.5 text-primary" />
                        </div>
                      )}
                      <div
                        className={`max-w-[86%] rounded-xl px-3 py-2 text-sm ${
                          msg?.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-card border shadow-sm'
                        }`}
                      >
                        {msg?.role === 'user' ? (
                          <div className="whitespace-pre-wrap">{msg?.content ?? ''}</div>
                        ) : (
                          <MarkdownRenderer content={msg?.content ?? ''} />
                        )}
                      </div>
                      {msg?.role === 'user' && (
                        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                          <User className="w-3.5 h-3.5 text-primary-foreground" />
                        </div>
                      )}
                    </motion.div>
                  ))}

                  {streamingContent && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-2 justify-start"
                    >
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="max-w-[86%] rounded-xl px-3 py-2 text-sm bg-card border shadow-sm">
                        <MarkdownRenderer content={streamingContent} />
                        <span className="inline-block w-1 h-4 bg-primary animate-pulse ml-1" />
                      </div>
                    </motion.div>
                  )}

                  {sending && !streamingContent && (
                    <div className="flex gap-2 justify-start">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="bg-card border rounded-xl px-3 py-2 shadow-sm">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>

              <form
                onSubmit={(e: React.FormEvent) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="flex gap-2"
              >
                <Input
                  placeholder="Rückfrage stellen..."
                  value={input}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
                  disabled={sending}
                  className="flex-1"
                />
                <Button type="submit" disabled={sending || !input?.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
