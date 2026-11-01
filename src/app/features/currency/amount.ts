// Accept a decimal point or comma and optional space grouping, never ambiguous comma grouping.
export function parseAmount(value: string): string | null {
  const normalized = value
    .trim()
    .replace(/[\s\u00a0\u202f]/g, '')
    .replace(',', '.');
  if (!/^\d{1,15}(\.\d{1,12})?$/.test(normalized)) return null;
  const [whole, fraction] = normalized.split('.');
  return `${whole.replace(/^0+(?=\d)/, '')}${fraction === undefined ? '' : '.' + fraction}`;
}
