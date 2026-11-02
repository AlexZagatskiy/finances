import { dataFreshness, parseCalendarDate } from './freshness';
const date = (s: string) => parseCalendarDate(s)!;
describe('Local calendar data freshness', () => {
  it.each([
    ['2026-11-02', '2026-11-02', false],
    ['2026-08-02', '2026-11-02', false], // Exactly three calendar months.
    ['2026-08-01', '2026-11-02', true],
    ['2025-12-31', '2026-01-01', true],
    ['2026-11-03', '2026-11-02', true],
    ['2024-02-29', '2024-05-29', false],
    ['2024-02-29', '2024-05-30', true],
    ['2024-01-31', '2024-04-30', false], // Clamp month-end anniversary.
    ['2024-01-31', '2024-05-01', true],
    ['2026-09-30', '2026-12-30', false],
    ['2026-09-30', '2026-12-31', true],
  ])('%s as of %s warns: %s', (asOf, today, warns) => {
    expect(!!dataFreshness(asOf, date(today))).toBe(warns);
  });
  it.each([
    undefined,
    null,
    '',
    'bad',
    '2026-02-29',
    '2026-13-01',
    '2026-11-31',
    '2026-11-02T00:00:00Z',
  ])('warns for invalid or missing date %s', (asOf) => {
    expect(dataFreshness(asOf, date('2026-11-02'))).toContain('missing or invalid');
  });
  it('ignores the local time of day', () => {
    expect(dataFreshness('2026-08-02', new Date(2026, 10, 2, 23, 59))).toBeNull();
  });
});
