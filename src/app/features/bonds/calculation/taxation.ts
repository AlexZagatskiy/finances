import { roundTax } from './bond-math';
export const interestTax = (interest: number, rate: number) =>
  roundTax(Math.max(0, interest) * rate);
