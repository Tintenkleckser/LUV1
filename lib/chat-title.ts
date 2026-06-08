function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

export function isDefaultChatTitle(value?: string | null) {
  const title = normalizeWhitespace(String(value ?? '')).toLowerCase();
  return !title
    || title === 'neuer chat'
    || title.includes('kompetenzeinschätzung nach luv')
    || title.includes('kompetenzeinschaetzung nach luv');
}

export function chatTitleFromContent(content: string) {
  const clean = normalizeWhitespace(String(content ?? ''));
  if (!clean) return 'Neuer Chat';

  if (/stärken-schwächen-profil|stärken-schwächen/i.test(clean)) {
    return 'Stärken-Schwächen-Profil';
  }
  if (/förderansätze|förderplanung/i.test(clean)) {
    return 'Förderansätze';
  }
  if (/verbale zusammenfassung|verbalisier|merkmalsausprägung/i.test(clean)) {
    return 'Verbalisierung nach Kompetenzkategorien';
  }

  const firstSentence = clean.split(/(?<=[.!?])\s/)[0] ?? clean;
  if (firstSentence.length <= 64) return firstSentence;

  const candidate = firstSentence.slice(0, 64);
  const lastSpace = candidate.lastIndexOf(' ');
  const shortened = candidate.slice(0, lastSpace >= 40 ? lastSpace : 64).trim();
  return `${shortened}…`;
}
