import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { fromMajor, money } from '@/types';
import {
  formatDayDivider,
  formatMoney,
  formatMoneyParts,
  formatRelativeDateTime,
  formatSignedMoney,
  formatTimeOfDay,
  percentageOf,
} from './format';

describe('formatMoney', () => {
  it('always shows cents for symbol currencies', () => {
    assert.equal(formatMoney(fromMajor(12450, 'USD')), '$12,450.00');
    assert.equal(formatMoney(fromMajor(15.99, 'USD')), '$15.99');
    assert.equal(formatMoney(fromMajor(1250, 'EUR')), '€1,250.00');
  });

  it('hides zero cents for code-prefixed currencies, as the design does', () => {
    assert.equal(formatMoney(fromMajor(15200, 'SAR')), 'SAR 15,200');
    assert.equal(formatMoney(fromMajor(75000, 'EGP')), 'EGP 75,000');
  });

  it('keeps cents on code-prefixed currencies when they are not zero', () => {
    assert.equal(formatMoney(fromMajor(3747.5, 'SAR')), 'SAR 3,747.50');
  });

  it('formats a negative amount by magnitude — the caller adds the sign', () => {
    assert.equal(formatMoney(money(-85000, 'USD')), '$850.00');
  });

  it('splits parts so the balance card can style the cents', () => {
    assert.deepEqual(formatMoneyParts(fromMajor(12450, 'USD')), {
      prefix: '$',
      whole: '12,450',
      fraction: '.00',
    });
  });
});

describe('formatSignedMoney', () => {
  it('uses a typographic minus, not a hyphen', () => {
    assert.equal(formatSignedMoney(fromMajor(850, 'USD'), 'debit'), '−$850.00');
    assert.equal(formatSignedMoney(fromMajor(4500, 'USD'), 'credit'), '+$4,500.00');
  });
});

describe('percentageOf', () => {
  it('reports the primary account share the wallet screen shows', () => {
    assert.equal(percentageOf(8250, 12450), 66);
  });

  it('is safe when the total is zero', () => {
    assert.equal(percentageOf(10, 0), 0);
  });
});

describe('formatTimeOfDay', () => {
  it('uses a 24-hour clock', () => {
    assert.equal(formatTimeOfDay('2026-08-24T18:04:00.000Z'), '18:04');
    assert.equal(formatTimeOfDay('2026-08-24T09:41:00.000Z'), '09:41');
  });
});

describe('formatRelativeDateTime', () => {
  const NOW = new Date('2026-08-24T12:00:00.000Z');

  it('says "Now" for something that just happened', () => {
    assert.equal(formatRelativeDateTime('2026-08-24T11:59:30.000Z', NOW), 'Now');
  });

  it('labels earlier today with the time', () => {
    assert.equal(formatRelativeDateTime('2026-08-24T09:41:00.000Z', NOW), 'Today, 09:41');
  });

  it('labels yesterday by name', () => {
    assert.equal(formatRelativeDateTime('2026-08-23T18:04:00.000Z', NOW), 'Yesterday, 18:04');
  });

  it('falls back to the date for anything older', () => {
    assert.equal(formatRelativeDateTime('2026-08-14T02:11:00.000Z', NOW), '14 Aug, 02:11');
  });
});

describe('formatDayDivider', () => {
  const NOW = new Date('2026-08-24T12:00:00.000Z');

  it('heads today\'s messages with TODAY', () => {
    assert.equal(formatDayDivider('2026-08-24T09:38:00.000Z', NOW), 'TODAY 09:38');
  });

  it('heads an older thread with its date', () => {
    assert.equal(formatDayDivider('2026-07-30T14:50:00.000Z', NOW), 'JUL 30 14:50');
  });
});
