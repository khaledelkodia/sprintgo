import { describe, expect, it } from 'vitest';
import { displayPhone, maskPhone, normalizeEgyptianPhone } from '../src/phone';

describe('normalizeEgyptianPhone', () => {
  it.each([
    ['01012345678', '+201012345678'],
    ['010 1234 5678', '+201012345678'],
    ['010-1234-5678', '+201012345678'],
    ['+201012345678', '+201012345678'],
    ['00201012345678', '+201012345678'],
    ['201012345678', '+201012345678'],
    ['٠١٠١٢٣٤٥٦٧٨', '+201012345678'],
    ['01112345678', '+201112345678'],
    ['01212345678', '+201212345678'],
    ['01512345678', '+201512345678'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizeEgyptianPhone(input)).toBe(expected);
  });

  it.each(['01312345678', '0101234567', '010123456789', '1012345678', 'abc', ''])(
    'rejects %s',
    (input) => {
      expect(normalizeEgyptianPhone(input)).toBeNull();
    },
  );
});

describe('display & mask', () => {
  it('displays local format', () => {
    expect(displayPhone('+201012345678')).toBe('01012345678');
  });
  it('masks middle digits', () => {
    expect(maskPhone('+201012345678')).toBe('+2010****678');
  });
});
