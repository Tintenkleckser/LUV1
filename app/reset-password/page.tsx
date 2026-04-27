'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Mail, Lock, ArrowLeft, CheckCircle, Send } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setEmailSent(true);
      } else {
        toast.error('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
      }
    } catch {
      toast.error('Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Die Passwörter stimmen nicht überein');
      return;
    }
    if (password.length < 6) {
      toast.error('Das Passwort muss mindestens 6 Zeichen lang sein');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/password-reset/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setResetSuccess(true);
      } else {
        toast.error(data.error || 'Ein Fehler ist aufgetreten');
      }
    } catch {
      toast.error('Ein Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  // Success state after password reset
  if (resetSuccess) {
    return (
      <Card className="shadow-lg">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mx-auto">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h3 className="text-lg font-semibold">Passwort erfolgreich geändert</h3>
          <p className="text-sm text-muted-foreground">Sie können sich jetzt mit Ihrem neuen Passwort anmelden.</p>
          <Button onClick={() => router.push('/')} className="w-full">
            Zur Anmeldung
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Email sent confirmation
  if (emailSent) {
    return (
      <Card className="shadow-lg">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mx-auto">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold">E-Mail gesendet</h3>
          <p className="text-sm text-muted-foreground">
            Falls ein Konto mit dieser E-Mail-Adresse existiert, erhalten Sie in Kürze eine E-Mail mit einem Link zum Zurücksetzen Ihres Passworts.
          </p>
          <p className="text-xs text-muted-foreground">
            Prüfen Sie auch Ihren Spam-Ordner.
          </p>
          <Button variant="outline" onClick={() => router.push('/')} className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" /> Zurück zur Anmeldung
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Reset password form (when token is present)
  if (token) {
    return (
      <Card className="shadow-lg">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-xl">Neues Passwort festlegen</CardTitle>
          <CardDescription>Geben Sie Ihr neues Passwort ein</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Neues Passwort</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Mindestens 6 Zeichen"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  required
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Passwort wiederholen"
                  value={confirmPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                  required
                  className="pl-10"
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Wird gespeichert...' : 'Passwort speichern'}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  // Request reset form (default)
  return (
    <Card className="shadow-lg">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-xl">Passwort vergessen?</CardTitle>
        <CardDescription>
          Geben Sie Ihre E-Mail-Adresse ein und wir senden Ihnen einen Link zum Zurücksetzen.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleRequestReset} className="space-y-4">
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
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              'Wird gesendet...'
            ) : (
              <><Send className="w-4 h-4 mr-2" /> Link senden</>
            )}
          </Button>
        </form>
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" /> Zurück zur Anmeldung
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
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
        </div>
        <Suspense fallback={
          <Card className="shadow-lg">
            <CardContent className="pt-6 flex justify-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </CardContent>
          </Card>
        }>
          <ResetPasswordContent />
        </Suspense>
      </motion.div>
    </div>
  );
}
