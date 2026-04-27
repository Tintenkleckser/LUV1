'use client';

import { useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ClipboardCheck, LogIn, UserPlus, Mail, Lock, User } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function AuthPage() {
  const { data: session, status } = useSession() || {};
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  if (status === 'authenticated') {
    router.replace('/dashboard');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const result = await signIn('credentials', {
          email,
          password,
          redirect: false,
        });
        if (result?.error) {
          toast.error('Anmeldung fehlgeschlagen. Prüfen Sie Ihre Eingaben.');
        } else {
          router.replace('/dashboard');
        }
      } else {
        const res = await fetch('/api/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data?.error ?? 'Registrierung fehlgeschlagen');
        } else {
          const loginResult = await signIn('credentials', {
            email,
            password,
            redirect: false,
          });
          if (loginResult?.error) {
            toast.error('Registrierung erfolgreich, Anmeldung fehlgeschlagen.');
          } else {
            router.replace('/dashboard');
          }
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      toast.error('Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4 overflow-hidden">
            <img src="/logo.png" alt="Kompetenzeinschätzung Logo" className="w-12 h-12 object-contain" />
          </div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">
            Kompetenzeinschätzung nach LuV
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            KI-gestützte Kompetenzanalyse für Berater:innen
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">
              {isLogin ? 'Anmelden' : 'Registrieren'}
            </CardTitle>
            <CardDescription>
              {isLogin
                ? 'Melden Sie sich mit Ihren Zugangsdaten an'
                : 'Erstellen Sie ein neues Berater-Konto'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="name"
                      placeholder="Ihr Name"
                      value={name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="ihre@email.de"
                    value={email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    required
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Passwort</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                    required
                    className="pl-10"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" loading={loading}>
                {isLogin ? (
                  <><LogIn className="w-4 h-4 mr-2" /> Anmelden</>
                ) : (
                  <><UserPlus className="w-4 h-4 mr-2" /> Registrieren</>
                )}
              </Button>
            </form>
            <div className="mt-4 text-center space-y-2">
              {isLogin && (
                <button
                  type="button"
                  onClick={() => router.push('/reset-password')}
                  className="text-sm text-muted-foreground hover:text-primary hover:underline block w-full"
                >
                  Passwort vergessen?
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-primary hover:underline"
              >
                {isLogin
                  ? 'Noch kein Konto? Jetzt registrieren'
                  : 'Bereits registriert? Jetzt anmelden'}
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
