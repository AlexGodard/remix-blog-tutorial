import { validateEmail } from './utils';

test('validateEmail returns false for non-emails', () => {
  // @ts-expect-error no nulls allowed
  expect(validateEmail()).toBe(false);
  // @ts-expect-error no nulls allowed
  expect(validateEmail()).toBe(false);
  expect(validateEmail('')).toBe(false);
  expect(validateEmail('not-an-email')).toBe(false);
  expect(validateEmail('n@')).toBe(false);
});

test('validateEmail returns true for emails', () => {
  expect(validateEmail('kody@example.com')).toBe(true);
});
