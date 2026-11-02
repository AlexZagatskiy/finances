// Currency boundary: PLN, two minor digits. No intermediate rate/formula rounding.
export function money(value: number): number {
  const absolute = Math.abs(value) * 100;
  return (
    (Math.sign(value) * Math.floor(absolute + 0.5 + Number.EPSILON * Math.max(1, absolute) * 4)) /
    100
  );
}
export const formatPLN = (value: number) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'PLN' }).format(value);
export function annuity(principal: number, annualRate: number, months: number): number {
  const rate = annualRate / 12;
  if (rate === 0) return principal / months;
  // log1p/expm1 keep near-zero rates numerically stable.
  return (principal * rate) / -Math.expm1(-months * Math.log1p(rate));
}
