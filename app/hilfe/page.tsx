import Link from 'next/link';
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  HelpCircle,
  MessageSquareText,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const steps = [
  {
    title: '1. Teilnehmenden-ID anlegen',
    text: 'Legen Sie eine pseudonyme Teilnehmenden-ID an. Bitte keine Klarnamen oder unmittelbar identifizierenden Daten verwenden.',
  },
  {
    title: '2. Kompetenzen einschätzen',
    text: 'Bewerten Sie jede Kompetenz von -3 bis +3 oder wählen Sie X, wenn keine Einschätzung möglich ist. Der Weiter-Button wird erst aktiv, wenn eine Bewertung gesetzt wurde.',
  },
  {
    title: '3. Fachfragen beantworten',
    text: 'Die Fachfragen liefern der KI den wichtigsten Kontext. Je konkreter die Antworten, desto brauchbarer wird die spätere Auswertung.',
  },
  {
    title: '4. KI-Auswertung nutzen',
    text: 'Nach dem Abschluss können Sie vorbereitete Prompts anklicken oder eigene Nachfragen stellen. Der Chatverlauf bleibt sichtbar und kann weitergeführt werden.',
  },
];

const tips = [
  'Beschreiben Sie Beobachtungen möglichst konkret: Situation, Verhalten, Häufigkeit und Kontext.',
  'Trennen Sie Beobachtung und Interpretation. Die KI kann besser arbeiten, wenn die Ausgangsdaten klar sind.',
  'Nutzen Sie die Folgefragen, wenn Sie Förderansätze, Formulierungen oder eine fachliche Einordnung vertiefen möchten.',
  'Speichern Sie Entwürfe, wenn eine Einschätzung noch nicht vollständig abgeschlossen werden kann.',
];

const faqs = [
  {
    question: 'Warum antwortet die KI manchmal nicht mit einer Auswertung?',
    answer:
      'Eine Auswertung wird erst erstellt, wenn mindestens 80 Prozent der Kompetenzen bewertet und mindestens 4 Fachfragen beantwortet wurden. Dadurch werden Scheinauswertungen bei zu wenig Daten vermieden.',
  },
  {
    question: 'Was bedeuten die Werte von -3 bis +3?',
    answer:
      '-3 bis -1 beschreiben Entwicklungsbereiche, 0 steht für eine alters- oder erwartungsgemäße Ausprägung, +1 bis +3 beschreiben Stärken. X bedeutet, dass keine fachlich belastbare Einschätzung möglich ist.',
  },
  {
    question: 'Welche Angaben sollte ich vermeiden?',
    answer:
      'Bitte keine Namen, Adressen, Telefonnummern oder andere direkt identifizierende personenbezogene Daten der Teilnehmenden eingeben. Arbeiten Sie mit pseudonymen IDs.',
  },
  {
    question: 'Kann ich nach der Auswertung weiterfragen?',
    answer:
      'Ja. Der KI-Bereich ist als Chat aufgebaut. Sie können eigene Fragen stellen, vorbereitete Prompts nutzen oder dynamische Folgefragen anklicken.',
  },
  {
    question: 'Werden Chatverläufe gespeichert?',
    answer:
      'Ja. Chatverläufe werden gespeichert, damit frühere Auswertungen links im KI-Bereich wiedergefunden und weitergeführt werden können.',
  },
  {
    question: 'Was mache ich, wenn eine Kompetenz nicht einschätzbar ist?',
    answer:
      'Wählen Sie X. Das ist besser als eine unsichere Bewertung, weil die KI dadurch erkennt, dass zu diesem Punkt keine belastbare Einschätzung vorliegt.',
  },
];

export default function HilfePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 px-4 py-8">
      <main className="mx-auto max-w-4xl">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link href="/">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Zurück
          </Link>
        </Button>

        <div className="mb-8">
          <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
            <HelpCircle className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">
            Kurzanleitung und FAQ
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Diese Seite fasst zusammen, wie Sie die App sinnvoll nutzen, welche Daten die KI braucht
            und worauf Sie beim Datenschutz achten sollten.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {steps.map((step) => (
            <Card key={step.title}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ClipboardCheck className="h-4 w-4 text-primary" />
                  {step.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-muted-foreground">
                {step.text}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bot className="h-5 w-5 text-primary" />
              So wird der KI-Chat hilfreicher
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm leading-6 text-muted-foreground">
              {tips.map((tip) => (
                <li key={tip} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquareText className="h-5 w-5 text-primary" />
              Häufige Fragen
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {faqs.map((item) => (
              <section key={item.question} className="py-4 first:pt-0 last:pb-0">
                <h2 className="text-sm font-semibold text-foreground">{item.question}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.answer}</p>
              </section>
            ))}
          </CardContent>
        </Card>

        <Card className="mt-6 border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col gap-3 p-5 text-sm leading-6 text-muted-foreground sm:flex-row">
            <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
            <p>
              Datenschutz-Hinweis: Die App ist für pseudonymisierte Arbeit gedacht. Nutzen Sie
              Teilnehmenden-IDs und vermeiden Sie unnötige personenbezogene Angaben in Freitextfeldern
              und Chatnachrichten.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
