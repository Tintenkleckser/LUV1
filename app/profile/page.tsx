'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft, Save, User, Mail, Calendar, Users,
  Hash, ClipboardCheck, Loader2, CheckCircle, Pencil
} from 'lucide-react';
import { toast } from 'sonner';

interface ClientData {
  id: string;
  clientCode: string;
  createdAt: string;
  _count: { assessments: number };
}

interface ProfileData {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  clients: ClientData[];
  _count: { assessments: number; clients: number };
}

export default function ProfilePage() {
  const { data: session, status, update } = useSession() || {};
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setName(data.name || '');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Profil konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchProfile();
    } else if (status === 'unauthenticated') {
      router.replace('/');
    }
  }, [status, fetchProfile, router]);

  const handleSaveName = async () => {
    if (!name.trim()) {
      toast.error('Name darf nicht leer sein');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile(prev => prev ? { ...prev, name: updated.name } : prev);
        setIsEditing(false);
        toast.success('Name erfolgreich geändert');
        // Update the session so the name is reflected everywhere
        await update({ name: updated.name });
      } else {
        const err = await res.json();
        toast.error(err.error || 'Fehler beim Speichern');
      }
    } catch (error) {
      console.error('Error saving name:', error);
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 px-4 py-8">
        <main className="mx-auto max-w-xl">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" /> Zurück zum Dashboard
          </Button>
          <Card>
            <CardHeader>
              <CardTitle>Profil konnte nicht geladen werden</CardTitle>
              <CardDescription>
                Bitte versuchen Sie es erneut oder kehren Sie zum Dashboard zurück.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={fetchProfile}>
                Erneut laden
              </Button>
            </CardContent>
          </Card>
        </main>
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
            <h1 className="text-lg font-display font-semibold tracking-tight">Mein Profil</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Zurück zum Dashboard
          </Button>
        </div>
      </header>

      <main className="max-w-[800px] mx-auto px-4 py-8 space-y-6">
        {/* Profile Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Persönliche Daten
              </CardTitle>
              <CardDescription>Verwalten Sie Ihre Kontoinformationen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Name */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  Name
                </Label>
                {isEditing ? (
                  <div className="flex gap-2">
                    <Input
                      value={name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                      placeholder="Ihr Name"
                      className="flex-1"
                      autoFocus
                      onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleSaveName()}
                    />
                    <Button onClick={handleSaveName} disabled={saving} size="sm">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span className="ml-1">Speichern</span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setIsEditing(false); setName(profile.name || ''); }}>
                      Abbrechen
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3">
                    <span className="text-foreground">{profile.name || '\u2013'}</span>
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  E-Mail
                </Label>
                <div className="bg-muted/50 rounded-lg px-4 py-3">
                  <span className="text-foreground">{profile.email}</span>
                </div>
              </div>

              {/* Member since */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  Mitglied seit
                </Label>
                <div className="bg-muted/50 rounded-lg px-4 py-3">
                  <span className="text-foreground">
                    {new Date(profile.createdAt).toLocaleDateString('de-DE', {
                      day: '2-digit', month: 'long', year: 'numeric'
                    })}
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="bg-primary/5 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-primary">{profile._count.clients}</div>
                  <div className="text-sm text-muted-foreground">Teilnehmende</div>
                </div>
                <div className="bg-primary/5 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-primary">{profile._count.assessments}</div>
                  <div className="text-sm text-muted-foreground">Assessments</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Participants Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Meine Teilnehmenden
              </CardTitle>
              <CardDescription>
                Übersicht aller {profile.clients.length} Teilnehmenden und deren Assessments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {profile.clients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p>Noch keine Teilnehmenden angelegt.</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => router.push('/dashboard')}>
                    Zum Dashboard
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {profile.clients.map((client, idx) => (
                    <motion.div
                      key={client.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: idx * 0.03 }}
                      className="flex items-center justify-between bg-muted/50 hover:bg-muted/80 rounded-lg px-4 py-3 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Hash className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{client.clientCode}</div>
                          <div className="text-xs text-muted-foreground">
                            Erstellt am {new Date(client.createdAt).toLocaleDateString('de-DE', {
                              day: '2-digit', month: '2-digit', year: 'numeric'
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <ClipboardCheck className="w-4 h-4" />
                          <span>{client._count.assessments}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
