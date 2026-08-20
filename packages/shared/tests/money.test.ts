import { describe, expect, it } from 'vitest';
import { formatMoney, poundsToPiasters } from '../src/money';

describe('money', () => {
  it('formats whole pounds without decimals', () => {
    expect(formatMoney(12500)).toBe('125 جنيه');
  });
  it('formats fractional pounds with two decimals', () => {
    expect(formatMoney(12550)).toBe('125.50 جنيه');
  });
  it('rounds pound conversion to integer piasters', () => {
    expect(poundsToPiasters(10.505)).toBe(1051);
  });
});
