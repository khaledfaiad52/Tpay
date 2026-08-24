/** ISO-4217 codes TPay supports today. Extend here, never inline. */
export const CURRENCIES = ['USD', 'SAR', 'AED', 'EGP', 'GBP', 'EUR'] as const;

export type CurrencyCode = (typeof CURRENCIES)[number];

/**
 * Money is always minor units + currency. Never a float, never a
 * pre-formatted string — formatting is a presentation concern
 * (`src/utils/format.ts`).
 */
export type Money = {
  /** Amount in the currency's smallest unit (cents, halalas, piastres…). */
  readonly minorUnits: number;
  readonly currency: CurrencyCode;
};

export function money(minorUnits: number, currency: CurrencyCode): Money {
  return { minorUnits, currency };
}

/** Convenience for fixture and form code that thinks in major units. */
export function fromMajor(major: number, currency: CurrencyCode): Money {
  return { minorUnits: Math.round(major * minorUnitFactor(currency)), currency };
}

export function toMajor(value: Money): number {
  return value.minorUnits / minorUnitFactor(value.currency);
}

export function minorUnitFactor(currency: CurrencyCode): number {
  return 10 ** minorUnitDigits(currency);
}

export function minorUnitDigits(_currency: CurrencyCode): number {
  // Every currency TPay supports today is 2-decimal. Zero- and three-decimal
  // currencies (JPY, KWD, BHD) get their exceptions here when they land.
  return 2;
}

export function isCredit(value: Money): boolean {
  return value.minorUnits > 0;
}

/**
 * How a fractional minor unit is resolved.
 *
 * Every rounding decision in TPay is explicit, because the direction decides
 * who absorbs the half-unit. `half-up` is the default for conversions;
 * `up` is used where TPay must never under-charge itself (a fee), and `down`
 * where the user must never be over-credited.
 */
export type RoundingMode = 'half-up' | 'up' | 'down';

function roundMinorUnits(value: number, mode: RoundingMode): number {
  if (mode === 'up') return Math.ceil(value - Number.EPSILON);
  if (mode === 'down') return Math.floor(value + Number.EPSILON);
  // Math.round is half-up for positives and half-up-toward-zero for
  // negatives; money here is always signed by direction, never by amount.
  return Math.round(value);
}

/** Guards against silently adding SAR to USD. */
function assertSameCurrency(a: Money, b: Money, operation: string): void {
  if (a.currency !== b.currency) {
    throw new Error(
      `Cannot ${operation} ${a.currency} and ${b.currency}. Convert through the FX layer first.`,
    );
  }
}

export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b, 'add');
  return { minorUnits: a.minorUnits + b.minorUnits, currency: a.currency };
}

export function subtractMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b, 'subtract');
  return { minorUnits: a.minorUnits - b.minorUnits, currency: a.currency };
}

/** Flips the sign. Used wherever a debit is applied as a signed delta. */
export function negate(value: Money): Money {
  return { minorUnits: -value.minorUnits, currency: value.currency };
}

export function sumMoney(values: readonly Money[], currency: CurrencyCode): Money {
  return values.reduce<Money>(
    (total, value) => addMoney(total, value),
    { minorUnits: 0, currency },
  );
}

/**
 * Scales an amount by a factor — a fee rate, an FX rate — rounding exactly
 * once, in the named direction.
 *
 * Multiplying is the only place a float touches money, and it is confined to
 * this one function so the rounding can be reasoned about in one place.
 */
export function multiplyMoney(
  value: Money,
  factor: number,
  mode: RoundingMode = 'half-up',
): Money {
  return {
    minorUnits: roundMinorUnits(value.minorUnits * factor, mode),
    currency: value.currency,
  };
}

/**
 * Converts between currencies at a rate, rounding once.
 *
 * The minor-unit scale of the two currencies is applied inside the single
 * rounding step, so a 2-decimal to 3-decimal conversion never rounds twice.
 */
export function convertMoney(
  value: Money,
  to: CurrencyCode,
  rate: number,
  mode: RoundingMode = 'half-up',
): Money {
  if (value.currency === to) return value;
  const scale = minorUnitFactor(to) / minorUnitFactor(value.currency);
  return { minorUnits: roundMinorUnits(value.minorUnits * rate * scale, mode), currency: to };
}

export function isZero(value: Money): boolean {
  return value.minorUnits === 0;
}

/** True when `a` is strictly larger than `b`. Same currency only. */
export function isGreaterThan(a: Money, b: Money): boolean {
  assertSameCurrency(a, b, 'compare');
  return a.minorUnits > b.minorUnits;
}
