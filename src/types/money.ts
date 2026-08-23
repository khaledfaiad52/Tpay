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
