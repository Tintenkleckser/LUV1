export const MIN_PASSWORD_LENGTH = 8;

export function validatePassword(password: unknown): string | null {
  if (typeof password !== 'string' || password.length === 0) {
    return 'Passwort ist erforderlich';
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Das Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein`;
  }

  return null;
}

export function normalizeOptionalName(name: unknown): string | null {
  if (typeof name !== 'string') {
    return null;
  }

  const trimmedName = name.trim();
  return trimmedName.length > 0 ? trimmedName : null;
}

export function sanitizeGeneratedChunk(content: unknown): string {
  if (typeof content !== 'string') {
    return '';
  }

  return content
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&lt;br\s*\/?&gt;/gi, '\n');
}

export function sanitizeGeneratedText(content: unknown): string {
  return sanitizeGeneratedChunk(content)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function countRatings(ratings: unknown): number {
  if (!ratings || typeof ratings !== 'object' || Array.isArray(ratings)) {
    return 0;
  }

  return Object.keys(ratings as Record<string, unknown>).filter((key) => key.trim().length > 0).length;
}

export function hasSufficientAssessmentData(input: {
  ratedCount: number;
  totalCount: number;
  answeredQuestionCount: number;
}) {
  const { ratedCount, totalCount, answeredQuestionCount } = input;

  if (totalCount === 0) {
    return true;
  }

  return ratedCount / totalCount >= 0.8 && answeredQuestionCount >= 4;
}
