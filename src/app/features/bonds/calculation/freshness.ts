export function parseCalendarDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null;
}
export function dataFreshness(value: unknown, now = new Date()): string | null {
  const date = parseCalendarDate(value);
  if (!date) return 'The data verification date is missing or invalid.';
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (date > today) return 'The data verification date is in the future.';
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 4, 0).getDate();
  const expiry = new Date(
    date.getFullYear(),
    date.getMonth() + 3,
    Math.min(date.getDate(), lastDay),
  );
  return date.getFullYear() < today.getFullYear() || today > expiry
    ? 'Interest rates and bond conditions may have changed since the last update. Calculations are based on stored data and may not reflect current offers.'
    : null;
}
