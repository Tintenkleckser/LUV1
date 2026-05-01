'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
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
  const [loading, setLoading] = useState(true);
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollChatToBottom = () => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollChatToBottom();
  }, [messages, streamingContent]);

  const fetchData = useCallback(async () => {
    try {
      const assessRes = await fetch(`/api/assessments/${assessmentId}`);
      if (assessRes.ok) {
        const aData = await assessRes.json();
        setAssessment(aData);
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

  const preparedPrompts = [
    {
      label: 'Stärken-Schwächen',
      icon: Target,
      prompt: 'Bitte erstelle eine strukturierte Stärken-Schwächen-Auswertung auf Basis der vorliegenden Kompetenzeinschätzung. Berücksichtige die fachlichen Antworten und leite daraus die wichtigsten Entwicklungsbereiche ab.',
    },
    {
      label: 'Verbalisierung',
      icon: Table2,
      prompt: 'Bitte formuliere die Ergebnisse der Kompetenzeinschätzung als gut lesbaren Fließtext für eine pädagogische oder rehabilitationspädagogische Dokumentation.',
    },
    {
      label: 'Förderansätze',
      icon: Lightbulb,
      prompt: 'Bitte entwickle konkrete Förderansätze und nächste Schritte auf Basis der vorliegenden Kompetenzeinschätzung. Priorisiere die wichtigsten Maßnahmen.',
    },
  ];

  const followUpPrompts = [
    'Welche Kompetenzbereiche sollten zuerst bearbeitet werden?',
    'Welche Beobachtungen wären für die nächste Einschätzung besonders wichtig?',
    'Wie lässt sich die Einschätzung wertschätzend zusammenfassen?',
  ];

  return (
    <div className="h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex flex-col overflow-hidden">
      <header className="shrink-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
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

      <main className="min-h-0 flex-1 max-w-[1200px] w-full mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-4">
        <aside className="hidden lg:flex min-h-0 flex-col rounded-lg border bg-card/90 p-3">
          <div className="px-1 pb-3">
            <div className="text-xs font-semibold text-muted-foreground">Vergangene Chats</div>
            <div className="text-xs text-muted-foreground mt-1">
              {assessment?.createdAt ? new Date(assessment.createdAt).toLocaleDateString('de-DE') : ''}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto space-y-2 pr-1">
            {(chats ?? []).map((chat) => (
              <button
                key={chat.id}
                onClick={() => loadChat(chat.id)}
                className={`w-full rounded-md border px-3 py-2 text-left transition-colors hover:bg-muted/60 ${
                  chat.id === chatId ? 'bg-primary/10 border-primary/30' : 'bg-background/70'
                }`}
              >
                <div className="text-xs font-medium truncate">{chat.title || 'Chatverlauf'}</div>
                <div className="text-xs text-muted-foreground line-clamp-3 mt-1">
                  {chat.lastMessage || 'Noch keine gespeicherte Antwort'}
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="min-h-0 flex flex-col rounded-lg border bg-card/90 overflow-hidden">
          <div className="shrink-0 border-b px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <MessageSquare className="w-4 h-4 text-primary" />
                KI-Chat zur Auswertung
              </div>
              <div className="text-xs text-muted-foreground truncate">
                Teilnehmende/r: {assessment?.client?.clientCode ?? assessment?.clientId ?? ''}
              </div>
            </div>
            <Sparkles className="w-5 h-5 text-primary/60 shrink-0" />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4">
            {(messages?.length ?? 0) === 0 && !streamingContent && (
              <div className="text-center py-16">
                <Sparkles className="w-12 h-12 text-primary/20 mx-auto mb-4" />
                <h3 className="text-lg font-display font-semibold mb-1">KI-Auswertung starten</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Wählen Sie unten einen vorbereiteten Prompt oder stellen Sie eine eigene Frage.
                </p>
              </div>
            )}

            {(messages ?? []).map((msg: Message, idx: number) => (
              <motion.div
                key={msg?.id ?? idx}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg?.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg?.role !== 'user' && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] rounded-xl px-4 py-3 text-sm ${
                    msg?.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background border shadow-sm'
                  }`}
                >
                  {msg?.role === 'user' ? (
                    <div className="whitespace-pre-wrap">{msg?.content ?? ''}</div>
                  ) : (
                    <div>
                      <MarkdownRenderer content={msg?.content ?? ''} />
                      <ExportButtons
                        content={msg?.content ?? ''}
                        filenameBase={`Chat-Antwort_${idx + 1}`}
                      />
                    </div>
                  )}
                </div>
                {msg?.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </motion.div>
            ))}

            {streamingContent && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 justify-start"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="max-w-[82%] rounded-xl px-4 py-3 text-sm bg-background border shadow-sm">
                  <MarkdownRenderer content={streamingContent} />
                  <span className="inline-block w-1 h-4 bg-primary animate-pulse ml-1" />
                </div>
              </motion.div>
            )}

            {sending && !streamingContent && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-background border rounded-xl px-4 py-3 shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="shrink-0 border-t bg-background/85 backdrop-blur px-4 py-3 space-y-3">
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {preparedPrompts.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.label}
                    variant="outline"
                    size="sm"
                    className="justify-start h-auto whitespace-normal text-left"
                    disabled={sending}
                    onClick={() => sendMessage(item.prompt)}
                  >
                    <Icon className="w-4 h-4 mr-2 shrink-0" />
                    {item.label}
                  </Button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2">
              {followUpPrompts.map((prompt) => (
                <Button
                  key={prompt}
                  variant="ghost"
                  size="sm"
                  className="h-auto rounded-full border bg-card px-3 py-1.5 text-xs font-normal"
                  disabled={sending}
                  onClick={() => sendMessage(prompt)}
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
