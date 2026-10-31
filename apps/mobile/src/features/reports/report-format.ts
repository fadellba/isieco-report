export function reportStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    SOUMIS: 'Soumis',
    EN_ATTENTE_COMPLEMENT: 'Complément demandé',
    COMPLEMENT_REPONDU: 'Complément transmis',
    QUALIFIE: 'Qualifié',
    REJETE: 'Rejeté',
  };
  return labels[status] ?? status;
}

export function dateLabel(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function localDateTimeToIso(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('Date de constat invalide.');
  return date.toISOString();
}

export function parseOptionalCoordinate(value: string, min: number, max: number): number | undefined {
  if (!value.trim()) return undefined;
  const number = Number(value.trim().replace(',', '.'));
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new Error('La coordonnée doit être comprise entre ' + min + ' et ' + max + '.');
  }
  return number;
}
