# Kompetenzeinschätzung nach LuV

KI-gestützte Kompetenzeinschätzung für Berater:innen in der beruflichen Rehabilitation.

## Funktionen

- **Authentifizierung:** Login/Registrierung mit E-Mail und Passwort, Passwort-Reset per Magic Link
- **Teilnehmenden-Verwaltung:** Anonymisierte Verwaltung von Teilnehmenden über Codes
- **Assessment-Interface:** Bewertung von Kompetenzen auf einer Skala von -3 bis +3, gruppiert nach Kategorien
- **Fachfragen:** 7 qualitative Fachfragen als Grundlage der KI-Analyse
- **KI-Analyse:** Drei Analyse-Modi (Stärken-Schwächen-Profil, Verbalisierung, Förderansätze) mit Streaming-Output
- **Chat:** Kontextbezogene Rückfragen an die KI zu jedem Assessment
- **Export:** Plain Text und Markdown Export für Word, Notion etc.
- **Entwürfe:** Assessments zwischenspeichern und später fortsetzen
- **Profilseite:** Namensänderung und Teilnehmenden-Übersicht

## Technologie-Stack

- **Framework:** Next.js 14 (App Router)
- **Sprache:** TypeScript
- **Datenbank:** PostgreSQL mit Prisma ORM
- **Wissensbasis:** Supabase (Read-Only für Fachinhalte)
- **Authentifizierung:** NextAuth.js
- **KI:** Provider-agnostisch – Mistral, OpenAI oder Abacus.AI (OpenAI-kompatible API)
- **UI:** Tailwind CSS, shadcn/ui, Framer Motion
- **E-Mail:** Resend (Vercel) oder Abacus.AI Notification API
- **Deployment:** Vercel oder Abacus.AI

## Voraussetzungen

- Node.js 18+
- PostgreSQL-Datenbank
- Supabase-Projekt mit den Tabellen `competencies`, `questions`, `wissen_luv`, `wissen_handbuch`

## Installation

```bash
# Repository klonen
git clone <repository-url>
cd kompetenzeinschaetzung

# Abhängigkeiten installieren
yarn install

# Umgebungsvariablen konfigurieren
cp .env.example .env
# .env ausfüllen (siehe unten)

# Datenbank-Schema anwenden
yarn prisma db push

# Optional: Seed-Daten einspielen
yarn prisma db seed

# Entwicklungsserver starten
yarn dev
```

## Umgebungsvariablen

Siehe `.env.example` für alle benötigten Variablen und Beispiele.

| Variable | Beschreibung | Erforderlich |
|----------|-------------|:---:|
| `DATABASE_URL` | PostgreSQL Connection String | ✅ |
| `NEXTAUTH_SECRET` | Zufälliger Secret Key für NextAuth | ✅ |
| `NEXTAUTH_URL` | URL der Anwendung | ✅ |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Projekt-URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key | ✅ |
| **LLM API** | | |
| `LLM_API_URL` | API-Endpunkt (z.B. Mistral, OpenAI) | ✅¹ |
| `LLM_API_KEY` | API Key für den LLM-Provider | ✅¹ |
| `LLM_MODEL` | Modellname (z.B. `mistral-large-latest`) | Optional |
| **E-Mail** | | |
| `RESEND_API_KEY` | Resend API Key (für Vercel) | ✅² |
| `RESEND_FROM_EMAIL` | Absender-Adresse | Optional |

¹ Falls nicht gesetzt, wird `ABACUSAI_API_KEY` als Fallback verwendet.
² Falls nicht gesetzt, wird die Abacus.AI Notification API verwendet.

### Deployment auf Vercel

1. Repository auf GitHub pushen
2. In Vercel importieren
3. Umgebungsvariablen setzen (siehe oben)
4. `prisma generate` wird automatisch beim Build ausgeführt (siehe `postinstall` Script oder füge `"postinstall": "prisma generate"` in `package.json` hinzu)
5. Deployen

## Projektstruktur

```
app/
├── api/                    # API-Routen
│   ├── analyze/            # KI-Analyse
│   ├── assessments/        # Assessment CRUD
│   ├── auth/               # NextAuth
│   ├── chat-stream/        # KI-Chat Streaming
│   ├── clients/            # Teilnehmenden-Verwaltung
│   ├── competencies/       # Kompetenzen (Supabase)
│   ├── messages/           # Chat-Nachrichten
│   ├── password-reset/     # Passwort zurücksetzen
│   ├── profile/            # Benutzerprofil
│   ├── questions/          # Fachfragen (Supabase)
│   └── signup/             # Registrierung
├── assessment/new/         # Assessment-Interface
├── chat/[id]/              # Chat-Interface
├── dashboard/              # Dashboard
├── profile/                # Profilseite
├── reset-password/         # Passwort zurücksetzen
└── results/[id]/           # Ergebnisanzeige
components/                 # Wiederverwendbare Komponenten
lib/                        # Hilfsfunktionen & Konfiguration
prisma/                     # Datenbank-Schema
```

## Lizenz

Privates Projekt – alle Rechte vorbehalten.
