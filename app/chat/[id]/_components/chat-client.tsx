'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft, Send, MessageSquare, Bot, User, Loader2, Sparkles, Pencil, Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { ExportButtons } from '@/components/export-buttons';

interface ChatClientProps {
  assessmentId: string;
}

interface Message {
  id?: string;
  role: string;
  content: string;
  created_at?: string;
}

interface ChatSummary {
  id: string;
  title: string;
  text?: string | null;
  lastMessage?: string | null;
  createdAt?: string;
}

export function ChatClient({ assessmentId }: ChatClientProps) {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef?.current?.scrollIntoView?.({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  const initChat = useCallback(async () => {
    try {
      // Check for existing chat
      const existingRes = await fetch(`/api/chats?assessment_id=${assessmentId}`);
      if (existingRes.ok) {
        const existingChats = await existingRes.json();
        setChats(existingChats ?? []);
        if ((existingChats?.length ?? 0) > 0) {
          const existingChat = existingChats[0];
          setChatId(existingChat?.id ?? null);
          // Load messages
          const msgsRes = await fetch(`/api/messages?chat_id=${existingChat?.id}`);
          if (msgsRes.ok) {
            const msgsData = await msgsRes.json();
            setMessages(msgsData ?? []);
          }
          setLoading(false);
          return;
        }
      }

      // Create new chat
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessment_id: assessmentId,
          title: 'Kompetenzeinschätzung nach LuV – Chat',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setChatId(data?.id ?? null);
        setChats((prev) => [data, ...(prev ?? [])]);
      }
    } catch (err: any) {
      console.error('Init chat error:', err);
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

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

  const createNewChat = async () => {
    setSending(false);
    setStreamingContent('');
    setMessages([]);
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assessment_id: assessmentId,
          title: 'Kompetenzeinschätzung nach LuV – Chat',
          text: 'Neuer Chat',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setChatId(data?.id ?? null);
        setChats((prev) => [data, ...(prev ?? [])]);
      } else {
        toast.error('Neuer Chat konnte nicht angelegt werden');
      }
    } catch (err: any) {
      console.error('Create chat error:', err);
      toast.error('Neuer Chat konnte nicht angelegt werden');
    }
  };

  const chatLabel = (chat: ChatSummary) => (
    chat.text || chat.title || chat.lastMessage || 'Neuer Chat'
  );

  const renameChat = async (chat: ChatSummary) => {
    const nextText = window.prompt('Chat umbenennen', chatLabel(chat));
    if (!nextText?.trim()) return;

    try {
      const res = await fetch('/api/chats', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: chat.id, text: nextText.trim() }),
      });
      if (!res.ok) {
        toast.error('Chat konnte nicht umbenannt werden');
        return;
      }
      const updated = await res.json();
      setChats((prev) => (prev ?? []).map((item) => (
        item.id === chat.id ? { ...item, ...updated } : item
      )));
    } catch (err: any) {
      console.error('Rename chat error:', err);
      toast.error('Chat konnte nicht umbenannt werden');
    }
  };

  const deleteChat = async (chat: ChatSummary) => {
    if (!window.confirm(`Chat "${chatLabel(chat)}" wirklich löschen?`)) return;

    try {
      const res = await fetch(`/api/chats?id=${encodeURIComponent(chat.id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        toast.error('Chat konnte nicht gelöscht werden');
        return;
      }

      const remainingChats = (chats ?? []).filter((item) => item.id !== chat.id);
      setChats(remainingChats);
      if (chatId === chat.id) {
        const nextChat = remainingChats[0];
        if (nextChat) {
          await loadChat(nextChat.id);
        } else {
          setChatId(null);
          setMessages([]);
          await createNewChat();
        }
      }
      toast.success('Chat gelöscht');
    } catch (err: any) {
      console.error('Delete chat error:', err);
      toast.error('Chat konnte nicht gelöscht werden');
    }
  };

  useEffect(() => {
    if (status === 'authenticated') initChat();
  }, [status, initChat]);

  const sendMessage = async () => {
    if (!input?.trim() || sending) return;
    const userMsg = input.trim();
    setInput('');
    setSending(true);
    setStreamingContent('');

    // Add user message to UI
    const newUserMsg: Message = { role: 'user', content: userMsg };
    setMessages((prev) => [...(prev ?? []), newUserMsg]);
    setChats((prev) => (prev ?? []).map((chat) => (
      chat.id === chatId ? { ...chat, text: userMsg, lastMessage: userMsg } : chat
    )));

    try {
      const res = await fetch('/api/chat-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message: userMsg,
          assessment_id: assessmentId,
          history: (messages ?? [])?.slice(-10)?.map((m: Message) => ({
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
        let lines = partialRead.split('\n');
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
      // If stream ended without completed
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

  const renderChatItem = (chat: ChatSummary, mobile = false) => (
    <div
      key={chat.id}
      className={`flex items-center gap-2 rounded-md border px-2 py-2 transition-colors hover:bg-muted/60 ${
        chat.id === chatId ? 'bg-primary/10 border-primary/30' : 'bg-background/60'
      } ${mobile ? 'min-w-[280px]' : 'w-full'}`}
    >
      <button
        type="button"
        onClick={() => loadChat(chat.id)}
        className="min-w-0 flex-1 text-left flex items-center gap-2"
      >
        <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate text-sm text-muted-foreground">{chatLabel(chat)}</span>
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground"
        onClick={() => renameChat(chat)}
        aria-label="Chat umbenennen"
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={() => deleteChat(chat)}
        aria-label="Chat löschen"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <div className="h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex flex-col overflow-hidden">
      <header className="shrink-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-[900px] mx-auto px-4 h-14 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/results/${assessmentId}`)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Ergebnisse
          </Button>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">KI-Chat</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
            Dashboard
          </Button>
        </div>
      </header>

      <main className="min-h-0 flex-1 max-w-[1180px] w-full mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        <aside className="hidden lg:flex min-h-0 flex-col rounded-lg border bg-card/85 p-3">
          <div className="mb-3 px-1 flex items-center justify-between gap-2">
            <div className="text-xs font-semibold text-muted-foreground">
              Bisherige Chatverläufe
            </div>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={createNewChat}>
              Neuer Chat
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto space-y-2 pr-1">
            {(chats ?? []).map((chat) => renderChatItem(chat))}
          </div>
        </aside>

        <div className="lg:hidden rounded-lg border bg-card/85 p-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-semibold text-muted-foreground">Bisherige Chatverläufe</div>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={createNewChat}>
              Neuer Chat
            </Button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(chats ?? []).map((chat) => renderChatItem(chat, true))}
          </div>
        </div>

        <section className="min-h-0 flex flex-col">
        {/* Messages */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain space-y-4 pr-1 pb-4">
          {(messages?.length ?? 0) === 0 && !streamingContent && (
            <div className="text-center py-16">
              <Sparkles className="w-12 h-12 text-primary/20 mx-auto mb-4" />
              <h3 className="text-lg font-display font-semibold mb-1">KI-Assistent</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Stellen Sie Fragen zu den Einschätzungen, bitten Sie um Erläuterungen oder lassen Sie sich Fördermaßnahmen vorschlagen.
              </p>
            </div>
          )}

          {(messages ?? [])?.map((msg: Message, idx: number) => (
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
                className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
                  msg?.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card border shadow-sm'
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

          {/* Streaming message */}
          {streamingContent && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 justify-start"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="max-w-[80%] rounded-xl px-4 py-3 text-sm bg-card border shadow-sm">
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
              <div className="bg-card border rounded-xl px-4 py-3 shadow-sm">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 border-t bg-background/80 backdrop-blur pt-4">
          <form
            onSubmit={(e: React.FormEvent) => { e.preventDefault(); sendMessage(); }}
            className="flex gap-2"
          >
            <Input
              placeholder="Ihre Frage..."
              value={input}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
              disabled={sending}
              className="flex-1"
            />
            <Button type="submit" disabled={sending || !input?.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
        </section>
      </main>
    </div>
  );
}
