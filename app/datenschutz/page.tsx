import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DatenschutzPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 px-4 py-8">
      <main className="mx-auto max-w-3xl">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link href="/">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Zurück
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Datenschutz und Cookies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 text-sm leading-6 text-muted-foreground">
            <section>
              <h2 className="mb-2 text-base font-semibold text-foreground">Zweck der Anwendung</h2>
              <p>
                Diese Anwendung unterstützt die Kompetenzeinschätzung nach LuV. Die App ist darauf ausgelegt,
                mit pseudonymen Teilnehmenden-IDs zu arbeiten. Es sollen keine Namen oder unmittelbar
                identifizierenden personenbezogenen Daten der Teilnehmenden eingegeben werden.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold text-foreground">Technisch notwendige Cookies</h2>
              <p>
                Für Anmeldung, Sitzungsverwaltung und Zugriffsschutz verwendet die Anwendung technisch notwendige
                Cookies. Diese Cookies sind erforderlich, damit angemeldete Nutzer:innen sicher arbeiten können.
                Es werden keine Marketing-, Analyse- oder Tracking-Cookies eingesetzt.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold text-foreground">Gespeicherte Daten</h2>
              <p>
                Gespeichert werden insbesondere Nutzerkonten, pseudonyme Teilnehmenden-IDs, Einschätzungen,
                Fachfragen-Antworten, Chatverläufe und KI-Auswertungen. Die Inhalte sollten so eingegeben werden,
                dass keine unnötigen personenbezogenen Daten enthalten sind.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold text-foreground">KI-Verarbeitung</h2>
              <p>
                Für KI-Antworten werden die für die jeweilige Auswertung erforderlichen Einschätzungsdaten und
                Fachfragen an den konfigurierten KI-Dienst übermittelt. Die Nutzung sollte mit dem Auftraggeber
                und den geltenden Datenschutzvorgaben abgestimmt werden.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold text-foreground">Hinweis</h2>
              <p>
                Diese Seite ersetzt keine rechtliche Prüfung. Für den produktiven Betrieb sollten Impressum,
                Verantwortliche Stelle, Auftragsverarbeitung, Löschfristen und Informationspflichten verbindlich
                durch den Betreiber ergänzt und geprüft werden.
              </p>
            </section>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
