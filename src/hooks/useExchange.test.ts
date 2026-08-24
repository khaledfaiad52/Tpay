import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatAmountForEditing, parseAmount } from './useExchange';

describe('parseAmount', () => {
  it('reads a plain decimal in major units', () => {
    assert.deepEqual(parseAmount('1000', 'USD'), { minorUnits: 100000, currency: 'USD' });
    assert.deepEqual(parseAmount('12.34', 'USD'), { minorUnits: 1234, currency: 'USD' });
  });

  it('tolerates thousands separators and padding', () => {
    assert.deepEqual(parseAmount(' 1,000.50 ', 'USD'), { minorUnits: 100050, currency: 'USD' });
  });

  it('rejects anything that is not a positive amount', () => {
    assert.equal(parseAmount('', 'USD'), undefined);
    assert.equal(parseAmount('0', 'USD'), undefined);
    assert.equal(parseAmount('-5', 'USD'), undefined);
    assert.equal(parseAmount('abc', 'USD'), undefined);
    assert.equal(parseAmount('1.2.3', 'USD'), undefined);
  });
});

describe('formatAmountForEditing', () => {
  it('groups and pads the amount once the field loses focus', () => {
    assert.equal(formatAmountForEditing({ minorUnits: 100000, currency: 'USD' }), '1,000.00');
    assert.equal(formatAmountForEditing({ minorUnits: 50, currency: 'USD' }), '0.50');
  });

  it('produces text that parses back to the same amount', () => {
    const amount = { minorUnits: 123456, currency: 'USD' } as const;
    assert.deepEqual(parseAmount(formatAmountForEditing(amount), 'USD'), amount);
  });
});
