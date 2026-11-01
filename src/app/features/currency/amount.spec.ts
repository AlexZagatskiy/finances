import { parseAmount } from './amount';
describe('Amount parsing', () => {
  it.each([
    ['1 234,56', '1234.56'],
    ['0', '0'],
    ['001.25', '1.25'],
    ['0.123456789012', '0.123456789012'],
  ])('normalizes %s', (input, expected) => expect(parseAmount(input)).toBe(expected));
  it.each(['', '-', '-1', '1.', '1,234.56', '1e9', 'NaN', '1.1234567890123'])(
    'rejects incomplete or ambiguous %s',
    (input) => expect(parseAmount(input)).toBeNull(),
  );
});
