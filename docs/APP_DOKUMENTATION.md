# App-Dokumentation: Kompetenzeinschaetzung nach LuV

Stand: 2026-05-05

## 1. Zweck der Anwendung

Die App unterstuetzt Beraterinnen und Berater bei der Kompetenzeinschaetzung nach LuV. Sie fuehrt durch einen strukturierten Bewertungsprozess, sammelt qualitative Fachinformationen und stellt anschliessend KI-gestuetzte Auswertungen sowie einen kontextbezogenen Chat bereit.

Die Anwendung ist fuer pseudonymisierte Arbeit ausgelegt. Teilnehmende werden ueber eine Teilnehmenden-ID verwaltet. Es sollen keine Klarnamen oder unmittelbar identifizierenden personenbezogenen Daten von Teilnehmenden eingegeben werden.

## 2. Zielgruppen und Rollen

Die App ist fuer Fachkraefte gedacht, die Kompetenzeinschaetzungen durchfuehren und daraus paedagogische, diagnostische oder foerderplanerische Schlussfolgerungen ableiten.

Aktuell gibt es technisch eine Nutzerrolle:

- Beraterin/Berater: kann sich registrieren, anmelden, Teilnehmenden-IDs anlegen, Einschaetzungen durchfuehren, Entwuerfe speichern, KI-Auswertungen erzeugen und Chatverlaeufe einsehen.

Eine getrennte Rollenverwaltung fuer Admin, Fachkraft, Auftraggeber oder Leserechte ist bisher nicht implementiert.

## 3. Kernfunktionen

### 3.1 Anmeldung und Registrierung

Die App nutzt NextAuth mit Credentials-Login. Nutzer registrieren sich mit E-Mail-Adresse, Passwort und optionalem Namen.

Wichtig: Die App verwendet nicht Supabase Auth. Neue Nutzer erscheinen deshalb nicht in Supabase unter Authentication Users, sondern in der Tabelle `public."User"`.

Seit der Stabilisierung der App gibt es fuer zentrale Datenbankzugriffe einen Supabase-REST-Fallback. Wenn Prisma oder der Supabase-Pooler nicht erreichbar ist, kann die App fuer wichtige Funktionen weiterhin ueber den serverseitigen Supabase Service Role Key arbeiten.

### 3.2 Passwort zuruecksetzen

Die App besitzt einen Passwort-zuruecksetzen-Flow. Tokens werden in `PasswordResetToken` gespeichert. Der Versand erfolgt ueber die konfigurierte E-Mail-Infrastruktur.

### 3.3 Teilnehmenden-Verwaltung

Teilnehmende werden nicht mit Namen, sondern mit einer Teilnehmenden-ID angelegt. Eine Teilnehmenden-ID ist pro Nutzer eindeutig.

Die wichtigsten Funktionen:

- neue Teilnehmenden-ID anlegen
- Teilnehmende im Dashboard anzeigen
- vorhandene Einschaetzungen pro Teilnehmenden-ID anzeigen
- neue Einschaetzung starten
- Entwurf fortsetzen

### 3.4 Kompetenzeinschaetzung

Die Einschaetzung basiert auf Kompetenzmerkmalen aus der Tabelle `competencies`.

Jede Kompetenz wird auf einer Skala bewertet:

- `-3`: deutlicher Entwicklungsbedarf
- `-2`: Entwicklungsbereich
- `-1`: eher Entwicklungsbereich
- `0`: durchschnittlich / altersgerecht
- `+1`: eher Staerke
- `+2`: Staerke
- `+3`: deutlich ausgepraegte Staerke
- `X`: nicht bewertbar / keine Angabe

Der Button `Weiter` wird erst aktiv, wenn die aktuelle Kompetenz bewertet wurde. Dadurch kann keine Kompetenz versehentlich uebersprungen werden.

In der Ergebnisuebersicht wird jede Bewertung mit einem zentrierten Balken dargestellt:

- `0` liegt in der Mitte
- negative Werte schlagen nach links aus
- positive Werte schlagen nach rechts aus
- `-3` fuellt die linke Haelfte vollstaendig
- `+3` fuellt die rechte Haelfte vollstaendig

### 3.5 Fachfragen

Nach den Kompetenzbewertungen folgen sieben qualitative Fachfragen aus der Tabelle `questions`.

Diese Antworten sind fuer die KI-Auswertung wesentlich, weil sie berufliche Wuensche, Erprobungsergebnisse, Voraussetzungen und fachliche Kontextinformationen liefern.

### 3.6 Zwischenspeichern

Einschaetzungen koennen als Entwurf gespeichert werden. Gespeichert werden:

- aktuelle Phase (`ratings` oder `questions`)
- aktuelle Position
- bisherige Bewertungen
- bisherige Fachfragen-Antworten
- Notizen
- Status `draft`

Beim Fortsetzen wird die Einschaetzung wieder an der gespeicherten Stelle geoeffnet.

### 3.7 Abschluss einer Einschaetzung

Beim Abschluss wird der Status auf `completed` gesetzt. Danach gelangt der Nutzer in den KI-Arbeitsbereich.

### 3.8 KI-Arbeitsbereich

Der KI-Bereich ist als Chat-Arbeitsbereich aufgebaut.

Links:

- vergangene Chatverlaeufe
- kurzer Hinweis aus `last_message`

Rechts:

- aktueller Chatverlauf
- Eingabefeld
- drei feste Hauptprompts
- dynamisch erzeugte Folgefragen

Die drei festen Hauptprompts sind:

- Staerken-Schwaechen
- Verbalisierung
- Foerderansaetze

Nach jeder KI-Antwort erzeugt die App im Hintergrund drei neue moegliche Folgefragen. Diese sollen typische Anschlussfragen abbilden, die aus der letzten Antwort entstehen.

### 3.9 Mindestdaten fuer KI-Auswertungen

Die KI darf erst fachlich auswerten, wenn eine Mindestdatenlage erreicht ist:

- mindestens 80 Prozent der Kompetenzen wurden bewertet
- mindestens 4 von 7 Fachfragen wurden beantwortet

Wenn diese Bedingung nicht erfuellt ist, erstellt die KI keine Scheinauswertung. Stattdessen gibt sie eine kurze Rueckmeldung, dass die Daten fuer eine belastbare Auswertung nicht ausreichen, und nennt den aktuellen Stand.

### 3.10 Export

KI-Antworten koennen exportiert oder kopiert werden. Der Export ist fuer die Weiterverarbeitung in Dokumentation, Word, Markdown oder fachlichen Berichten gedacht.

## 4. Datenmodell

### 4.1 App-Tabellen

Die wichtigsten dynamischen App-Tabellen sind:

- `User`: Nutzerkonten der App
- `Client`: pseudonyme Teilnehmenden-IDs
- `Assessment`: Einschaetzungen, Bewertungen, Fachfragen, Status
- `Chat`: Chat-Sitzungen zu Einschaetzungen
- `Message`: Nachrichten innerhalb eines Chats
- `PasswordResetToken`: Tokens fuer Passwort-Zuruecksetzen

Weitere NextAuth-nahe Tabellen:

- `Account`: fuer externe OAuth-Provider, aktuell leer und nicht aktiv genutzt
- `Session`: fuer Datenbank-Sessions, aktuell nicht zentral genutzt, da JWT-Strategie
- `VerificationToken`: fuer Magic-Link/E-Mail-Login, aktuell nicht zentral genutzt

### 4.2 Fach- und Wissenstabellen

Die wichtigsten statischen oder fachlichen Tabellen sind:

- `competencies`: Kompetenzmerkmale, Kategorien, Beschreibungen, Indikatoren
- `questions`: sieben qualitative Fachfragen
- `wissen_luv`: LuV-Wissens- und Vorlagentexte
- `wissen_handbuch`: Handbuchwissen
- `wissen_dik2`: DIK2-Wissen

Die Wissenstabellen koennen Felder wie `content`, `category`, `kategorie`, `source_file`, `page`, `metadata` und optional `embedding` enthalten. Die App toleriert bei einigen Tabellen beide Varianten `category` und `kategorie`.

## 5. KI- und RAG-Konzept

### 5.1 KI-Provider

Die App ist provider-agnostisch angelegt. Sie verwendet eine OpenAI-kompatible Chat-Completions-Schnittstelle. In der aktuellen Konfiguration kann Mistral genutzt werden.

Wichtige Variablen:

- `LLM_API_URL`
- `LLM_API_KEY`
- `LLM_MODEL`

### 5.2 Kontext fuer KI-Antworten

Fuer KI-Antworten werden mehrere Datenquellen kombiniert:

- quantitative Kompetenzbewertungen
- qualitative Fachfragen-Antworten
- Handbuchwissen
- LuV-Wissen
- optional DIK2-Wissen
- bisheriger Chatverlauf

Die KI soll sachlich, wertschätzend und diagnostisch fundiert antworten. Sie soll keine Diagnosen stellen und nicht von "Klient" sprechen, sondern von "Teilnehmende/r" oder "der/die Teilnehmende".

### 5.3 DIK2

Die Tabelle `wissen_dik2` ist fuer zusaetzliches fachdiagnostisches Wissen vorgesehen. Sie ist nicht zwingend fuer den Grundbetrieb, kann aber in Einzelfaellen die fachliche Einordnung verbessern.

Beim Import ist wichtig, dass die CSV-Header zu den Tabellenspalten passen. Falls die CSV `kategorie` und `page` enthaelt, muessen diese Spalten in der Tabelle vorhanden sein.

## 6. Technische Architektur

### 6.1 Framework

Die App basiert auf:

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-Komponenten
- NextAuth
- Prisma
- Supabase

### 6.2 Serverrouten

Wichtige API-Routen:

- `/api/signup`: Registrierung
- `/api/auth/[...nextauth]`: Login und Session
- `/api/clients`: Teilnehmenden-Verwaltung
- `/api/assessments`: Einschaetzungen listen und anlegen
- `/api/assessments/[id]`: einzelne Einschaetzung laden und aktualisieren
- `/api/competencies`: Kompetenzdaten
- `/api/questions`: Fachfragen
- `/api/analyze`: klassische KI-Analyse
- `/api/chat-stream`: streamingbasierter KI-Chat
- `/api/chats`: Chat-Sitzungen
- `/api/messages`: Chat-Nachrichten
- `/api/followups`: dynamische Folgefragen
- `/api/debug/env`: Diagnose der Serverumgebung

### 6.3 Prisma und Supabase-Fallback

Urspruenglich liefen die dynamischen App-Tabellen ueber Prisma/Postgres. Da die Vercel-Verbindung zum Supabase-Pooler wiederholt instabil war, wurde ein Supabase-REST-Fallback eingebaut.

Das Prinzip:

1. Prisma bleibt der normale Weg.
2. Wenn Prisma mit typischen Pooler- oder Authentifizierungsfehlern scheitert, nutzt die App Supabase REST.
3. Der REST-Fallback nutzt serverseitig den `SUPABASE_SERVICE_ROLE_KEY`.

Fallbacks existieren unter anderem fuer:

- Login
- Registrierung
- Klienten laden/anlegen
- Assessments laden/anlegen
- einzelne Assessments laden/aktualisieren

Diese Architektur ist pragmatisch. Sie vermeidet Ausfaelle durch Pooler-Probleme, sollte aber langfristig konsolidiert werden.

## 7. Datenschutz und DSGVO-Hinweise

Die App speichert keine Klarnamen von Teilnehmenden, wenn sie korrekt genutzt wird. Teilnehmende werden ueber IDs verwaltet.

Gespeichert werden trotzdem personenbezogene oder personenbeziehbare Daten, insbesondere:

- Nutzerkonten der Beraterinnen und Berater
- pseudonyme Teilnehmenden-IDs
- Kompetenzbewertungen
- Fachfragen-Antworten
- Notizen
- Chatverlaeufe
- KI-Auswertungen

Die App verwendet technisch notwendige Cookies fuer Anmeldung und Sicherheit. Es gibt aktuell kein Tracking und keine Analytics.

Eine Datenschutzseite `/datenschutz` und ein Cookie-Hinweis fuer technisch notwendige Cookies sind eingebaut.

Fuer den Produktivbetrieb muessen noch betreiberspezifisch ergaenzt werden:

- Verantwortliche Stelle
- Impressum
- Kontakt Datenschutz
- Auftragsverarbeitung mit Hosting-, Supabase- und KI-Anbietern
- Loeschfristen
- TOMs
- Regelung zur Eingabe personenbezogener Daten
- Pruefung der KI-Datenverarbeitung

## 8. Sicherheit und RLS

Die App arbeitet serverseitig mit Supabase Service Role. Dieser Key darf niemals im Browser sichtbar werden.

Empfehlung fuer Supabase:

- RLS fuer sensible Tabellen aktivieren
- keine oeffentlichen anon-Policies fuer App-Tabellen
- Zugriff auf App-Tabellen nur serverseitig

Sensible Tabellen:

- `User`
- `Client`
- `Assessment`
- `Chat`
- `Message`
- `PasswordResetToken`
- `Account`
- `Session`
- `VerificationToken`

Fachliche Tabellen koennen ebenfalls serverseitig gelesen werden. Oeffentliche Lesepolicies sind aktuell nicht erforderlich.

## 9. Betrieb und Deployment

Die App laeuft auf Vercel.

Wichtige Umgebungsvariablen:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `LLM_API_URL`
- `LLM_API_KEY`
- `LLM_MODEL`
- optional `RESEND_API_KEY`
- optional `RESEND_FROM_EMAIL`

Der wichtigste Diagnose-Endpunkt ist:

```text
/api/debug/env
```

Er zeigt:

- ob `DATABASE_URL` vorhanden und parsebar ist
- ob Prisma die Datenbank erreicht
- ob zentrale Prisma-Counts funktionieren
- ob Supabase REST zentrale Tabellen lesen kann
- ob wichtige Environment-Variablen gesetzt sind

## 10. Bekannte Besonderheiten

### 10.1 Supabase Auth wird nicht genutzt

Neue Nutzer erscheinen nicht in Supabase Authentication Users, sondern in `public."User"`.

### 10.2 Prisma/PgBouncer ist nicht die alleinige Lebensader

Wegen wiederholter Pooler-Probleme gibt es einen Supabase-REST-Fallback. Deshalb kann `/api/debug/env` bei Prisma weiterhin Fehler zeigen, waehrend die App trotzdem funktioniert.

### 10.3 DIK2 ist hilfreich, aber nicht kritisch

DIK2 verbessert fachliche Antworten, ist aber nicht fuer die Grundfunktionen erforderlich.

### 10.4 Keine KI-Auswertung bei zu wenig Daten

Die KI blockiert Scheinauswertungen, wenn die Mindestdatenlage nicht erreicht ist.

## 11. Empfohlene Testdurchlaeufe

Nach groesseren Aenderungen sollten diese Schritte getestet werden:

1. Registrierung eines neuen Nutzers
2. Login
3. Klienten-ID anlegen
4. Einschaetzung starten
5. Weiter-Button ohne Bewertung pruefen
6. mehrere Kompetenzen bewerten
7. Zwischenspeichern
8. Dashboard aufrufen
9. Entwurf fortsetzen
10. mindestens 80 Prozent bewerten
11. mindestens 4 Fachfragen beantworten
12. Einschaetzung abschliessen
13. KI-Chat starten
14. vorbereitete Prompts klicken
15. dynamische Folgefragen pruefen
16. Export pruefen
17. Datenschutzseite und Cookie-Hinweis pruefen

## 12. Offene Punkte

Die folgenden Punkte sind fachlich oder organisatorisch noch offen:

- DSGVO-Angaben des Betreibers ergaenzen
- Impressum ergaenzen
- Loeschkonzept definieren
- DIK2-Import und Datenqualitaet weiter pruefen
- langfristig Prisma/Supabase-REST-Architektur vereinheitlichen
- Rollen- und Rechtekonzept klaeren
- Admin-Funktionen fuer Datenpflege erwaegen

