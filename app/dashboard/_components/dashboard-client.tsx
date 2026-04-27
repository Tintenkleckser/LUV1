'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ClipboardCheck, Plus, Users, LogOut, History, PlayCircle,
  Search, Hash, Loader2, ChevronRight, Calendar, Pencil, FileEdit
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface Client {
  id: string;
  clientCode: string;
  userId: string;
  createdAt: string;
  _count?: { assessments: number };
}

interface Assessment {
  id: string;
  clientId: string;
  createdAt: string;
  ratings: Record<string, any>;
  status?: string;
}

export function DashboardClient() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientId, setNewClientId] = useState('');
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientAssessments, setClientAssessments] = useState<Assessment[]>([]);
  const [loadingAssessments, setLoadingAssessments] = useState(false);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch('/api/clients');
      if (res.ok) {
        const data = await res.json();
        setClients(data ?? []);
      }
    } catch (err: any) {
      console.error('Fetch clients error:', err);
    }
  }, []);

  const fetchAllAssessments = useCallback(async () => {
    try {
      const res = await fetch('/api/assessments');
      if (res.ok) {
        const data = await res.json();
        setAssessments(data ?? []);
      }
    } catch (err: any) {
      console.error('Fetch assessments error:', err);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      setLoading(true);
      Promise.all([fetchClients(), fetchAllAssessments()]).finally(() => setLoading(false));
    }
  }, [status, fetchClients, fetchAllAssessments]);

  const handleCreateClient = async () => {
    if (!newClientId?.trim()) {
      toast.error('Bitte geben Sie eine Teilnehmenden-ID ein');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_code: newClientId.trim() }),
      });
      if (res.ok) {
        toast.success('Teilnehmende/r erfolgreich angelegt');
        setNewClientId('');
        setShowNewClient(false);
        await fetchClients();
      } else {
        const data = await res.json();
        toast.error(data?.error ?? 'Fehler beim Anlegen');
      }
    } catch (err: any) {
      console.error('Create client error:', err);
      toast.error('Fehler beim Anlegen');
    } finally {
      setCreating(false);
    }
  };

  const handleSelectClient = async (client: Client) => {
    setSelectedClient(client);
    setLoadingAssessments(true);
    try {
      const res = await fetch(`/api/assessments?client_id=${encodeURIComponent(client?.id)}`);
      if (res.ok) {
        const data = await res.json();
        setClientAssessments(data ?? []);
      }
    } catch (err: any) {
      console.error('Fetch client assessments:', err);
    } finally {
      setLoadingAssessments(false);
    }
  };

  const startNewAssessment = (clientRecordId: string) => {
    router.push(`/assessment/new?client_id=${encodeURIComponent(clientRecordId)}`);
  };

  const getAssessmentCount = (clientRecordId: string) => {
    return (assessments ?? [])?.filter((a: Assessment) => a?.clientId === clientRecordId)?.length ?? 0;
  };

  const filteredClients = (clients ?? [])?.filter((c: Client) =>
    c?.clientCode?.toLowerCase()?.includes(searchTerm?.toLowerCase() ?? '') ?? false
  ) ?? [];

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
        <div className="max-w-[1200px] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
              <img src="/logo.png" alt="Logo" className="w-7 h-7 object-contain" />
            </div>
            <h1 className="text-lg font-display font-semibold tracking-tight">Kompetenzeinschätzung nach LuV</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/profile')}
              className="text-sm text-muted-foreground hover:text-foreground hidden sm:block transition-colors cursor-pointer"
              title="Profil bearbeiten"
            >
              {session?.user?.name ?? session?.user?.email ?? ''}
            </button>
            <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: '/' })}>
              <LogOut className="w-4 h-4 mr-1" /> Abmelden
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-4 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-display font-bold tracking-tight mb-1">
            Willkommen zurück{session?.user?.name ? `, ${session.user.name}` : ''}
          </h2>
          <p className="text-muted-foreground">Verwalten Sie Ihre Teilnehmenden und erstellen Sie Kompetenzeinschätzungen nach LuV</p>
        </motion.div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-mono">{clients?.length ?? 0}</p>
                    <p className="text-sm text-muted-foreground">Teilnehmende</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <ClipboardCheck className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-mono">{assessments?.length ?? 0}</p>
                    <p className="text-sm text-muted-foreground">Einschätzungen</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card variant="interactive" className="cursor-pointer" onClick={() => setShowNewClient(true)}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Plus className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Neue/n Teilnehmende/n anlegen</p>
                    <p className="text-xs text-muted-foreground">Nur mit Teilnehmenden-ID</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Teilnehmenden-ID suchen..."
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={() => setShowNewClient(true)}>
            <Plus className="w-4 h-4 mr-1" /> Neue/r Teilnehmende/r
          </Button>
        </div>

        {/* Clients Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {(filteredClients ?? [])?.map((client: Client, index: number) => (
              <motion.div
                key={client?.id ?? index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  variant="interactive"
                  className="cursor-pointer"
                  onClick={() => handleSelectClient(client)}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Hash className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold font-mono text-sm">{client?.clientCode ?? 'N/A'}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <ClipboardCheck className="w-3 h-3" />
                            {client?._count?.assessments ?? getAssessmentCount(client?.id)} Einschätzungen
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {(filteredClients?.length ?? 0) === 0 && !loading && (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchTerm ? 'Keine Teilnehmenden gefunden' : 'Noch keine Teilnehmenden vorhanden'}
            </p>
            <Button className="mt-4" onClick={() => setShowNewClient(true)}>
              <Plus className="w-4 h-4 mr-1" /> Erste/n Teilnehmende/n anlegen
            </Button>
          </div>
        )}
      </main>

      {/* New Client Dialog */}
      <Dialog open={showNewClient} onOpenChange={setShowNewClient}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Neue/n Teilnehmende/n anlegen</DialogTitle>
            <DialogDescription>
              Geben Sie eine eindeutige Teilnehmenden-ID ein. Es werden keine persönlichen Daten gespeichert.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="clientId">Teilnehmenden-ID</Label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="clientId"
                  placeholder="z.B. KL-2026-001"
                  value={newClientId}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewClientId(e.target.value)}
                  className="pl-10"
                  onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleCreateClient()}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewClient(false)}>Abbrechen</Button>
            <Button onClick={handleCreateClient} loading={creating}>
              <Plus className="w-4 h-4 mr-1" /> Anlegen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Client Detail Dialog */}
      <Dialog open={!!selectedClient} onOpenChange={(open: boolean) => !open && setSelectedClient(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hash className="w-5 h-5 text-primary" />
              Teilnehmende/r: {selectedClient?.clientCode ?? ''}
            </DialogTitle>
            <DialogDescription>
              Verlauf und Aktionen
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Button
              className="w-full"
              onClick={() => startNewAssessment(selectedClient?.id ?? '')}
            >
              <PlayCircle className="w-4 h-4 mr-2" /> Neue Einschätzung starten
            </Button>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <History className="w-4 h-4" /> Bisherige Einschätzungen
              </h4>
              {loadingAssessments ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (clientAssessments?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground py-2">Noch keine Einschätzungen vorhanden</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {(clientAssessments ?? [])?.map((a: Assessment) => {
                    const isDraft = a?.status === 'draft';
                    return (
                      <Card
                        key={a?.id}
                        variant="interactive"
                        className="cursor-pointer"
                        onClick={() => {
                          if (isDraft) {
                            router.push(`/assessment/new?assessment_id=${a?.id}&client_id=${selectedClient?.id ?? ''}`);
                          } else {
                            router.push(`/results/${a?.id}`);
                          }
                        }}
                      >
                        <CardContent className="py-3 px-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">
                                {a?.createdAt ? new Date(a?.createdAt).toLocaleDateString('de-DE') : 'Unbekannt'}
                              </span>
                              {isDraft && (
                                <span className="text-[10px] font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Entwurf</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {Object.keys(a?.ratings ?? {})?.length ?? 0} Bewertungen
                              </span>
                              {isDraft ? (
                                <PlayCircle className="w-4 h-4 text-primary" />
                              ) : (
                                <button
                                  onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    router.push(`/assessment/new?assessment_id=${a?.id}&client_id=${selectedClient?.id ?? ''}`);
                                  }}
                                  className="text-muted-foreground hover:text-primary transition-colors"
                                  title="Einschätzung bearbeiten"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
