import { describe, expect, it } from 'vitest';
import { canTransition } from '../src/transitions';

describe('DELIVERY flow', () => {
  it('merchant accepts a placed order', () => {
    expect(canTransition('DELIVERY', 'PLACED', 'PREPARING', 'MERCHANT')).toBe(true);
  });
  it('courier — not the merchant — takes the order out for delivery', () => {
    expect(canTransition('DELIVERY', 'READY', 'OUT_FOR_DELIVERY', 'COURIER')).toBe(true);
    expect(canTransition('DELIVERY', 'READY', 'OUT_FOR_DELIVERY', 'MERCHANT')).toBe(false);
  });
  it('customer can cancel only while PLACED', () => {
    expect(canTransition('DELIVERY', 'PLACED', 'CANCELLED', 'CUSTOMER')).toBe(true);
    expect(canTransition('DELIVERY', 'PREPARING', 'CANCELLED', 'CUSTOMER')).toBe(false);
  });
  it('no transitions out of terminal statuses', () => {
    expect(canTransition('DELIVERY', 'CANCELLED', 'PREPARING', 'ADMIN')).toBe(false);
    expect(canTransition('DELIVERY', 'COMPLETED', 'PLACED', 'SUPER_ADMIN')).toBe(false);
  });
});

describe('ERRAND flow', () => {
  it('skips store preparation entirely', () => {
    expect(canTransition('ERRAND', 'PLACED', 'OUT_FOR_DELIVERY', 'COURIER')).toBe(true);
    expect(canTransition('ERRAND', 'PLACED', 'PREPARING', 'MERCHANT')).toBe(false);
  });
  it('merchants have no say in errand transitions', () => {
    expect(canTransition('ERRAND', 'OUT_FOR_DELIVERY', 'DELIVERED', 'MERCHANT')).toBe(false);
    expect(canTransition('ERRAND', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COURIER')).toBe(true);
  });
});
