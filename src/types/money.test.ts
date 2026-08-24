import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  addMoney,
  convertMoney,
  fromMajor,
  isGreaterThan,
  isZero,
  money,
  multiplyMoney,
  negate,
  subtractMoney,
  sumMoney,
} from './money';

describe('money arithmetic', () => {
  it('adds and subtracts in minor units', () => {
    assert.deepEqual(addMoney(money(1050, 'USD'), money(275, 'USD')), money(1325, 'USD'));
    assert.deepEqual(subtractMoney(money(1050, 'USD'), money(275, 'USD')), money(775, 'USD'));
  });

  it('refuses to add two different currencies', () => {
    assert.throws(() => addMoney(money(100, 'USD'), money(100, 'SAR')), /Convert through the FX/);
  });

  it('refuses to compare two different currencies', () => {
    assert.throws(() => isGreaterThan(money(100, 'USD'), money(100, 'SAR')));
  });

  it('negates for a debit', () => {
    assert.deepEqual(negate(money(500, 'USD')), money(-500, 'USD'));
    assert.deepEqual(negate(negate(money(500, 'USD'))), money(500, 'USD'));
  });

  it('sums a list', () => {
    assert.deepEqual(
      sumMoney([money(100, 'USD'), money(250, 'USD'), money(5, 'USD')], 'USD'),
      money(355, 'USD'),
    );
    assert.deepEqual(sumMoney([], 'USD'), money(0, 'USD'));
  });

  it('never produces a fractional minor unit', () => {
    const scaled = multiplyMoney(money(333, 'USD'), 0.0025);
    assert.equal(Number.isInteger(scaled.minorUnits), true);
  });

  it('rounds a fee up, so TPay never under-charges its own spread', () => {
    // 0.25% of $10.01 is 2.5025 minor units.
    assert.equal(multiplyMoney(money(1001, 'USD'), 0.0025, 'up').minorUnits, 3);
    assert.equal(multiplyMoney(money(1001, 'USD'), 0.0025, 'down').minorUnits, 2);
    assert.equal(multiplyMoney(money(1001, 'USD'), 0.0025, 'half-up').minorUnits, 3);
  });

  it('does not round a whole result up by a floating-point hair', () => {
    // 0.29 * 100 is 28.999999999999996 in binary floating point.
    assert.equal(multiplyMoney(money(100, 'USD'), 0.29, 'up').minorUnits, 29);
    assert.equal(multiplyMoney(money(300, 'USD'), 0.1, 'down').minorUnits, 30);
  });

  it('converts by rounding exactly once', () => {
    // $1,000 at 3.7475 is SAR 3,747.50 — the figure the design shows.
    assert.deepEqual(convertMoney(fromMajor(1000, 'USD'), 'SAR', 3.7475), fromMajor(3747.5, 'SAR'));
  });

  it('leaves an amount alone when the currency already matches', () => {
    const value = money(1234, 'USD');
    assert.equal(convertMoney(value, 'USD', 3.75), value);
  });

  it('agrees with itself, so a quote and its execution cannot differ', () => {
    const amount = fromMajor(852.37, 'USD');
    const rate = 48.6;
    assert.deepEqual(convertMoney(amount, 'EGP', rate), convertMoney(amount, 'EGP', rate));
  });

  it('survives a round trip within one minor unit', () => {
    const start = fromMajor(1000, 'USD');
    const there = convertMoney(start, 'EGP', 48.6);
    const back = convertMoney(there, 'USD', 1 / 48.6);
    assert.ok(Math.abs(back.minorUnits - start.minorUnits) <= 1);
  });

  it('knows zero', () => {
    assert.equal(isZero(money(0, 'USD')), true);
    assert.equal(isZero(money(1, 'USD')), false);
  });

  it('compares within one currency', () => {
    assert.equal(isGreaterThan(money(200, 'USD'), money(100, 'USD')), true);
    assert.equal(isGreaterThan(money(100, 'USD'), money(100, 'USD')), false);
  });
});
