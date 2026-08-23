import type { FxService } from '@/services/contracts';
import { minorUnitFactor, type CurrencyCode } from '@/types';
import { respond } from './latency';

/** Indicative demo rates against USD. Replaced by a provider adapter later. */
const USD_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  SAR: 3.7475,
  AED: 3.6725,
  EGP: 48.6,
  GBP: 0.784,
  EUR: 0.921,
};

/** Flat 0.4% spread, mirroring the fee line in the Exchange design. */
const SPREAD = 0.004;

function rate(from: CurrencyCode, to: CurrencyCode): number {
  return USD_RATES[to] / USD_RATES[from];
}

export const mockFxService: FxService = {
  getRate: (from, to) => respond('fxService.getRate', rate(from, to)),

  quote: (sourceAmount, to) => {
    const appliedRate = rate(sourceAmount.currency, to);
    const feeMinorUnits = Math.round(sourceAmount.minorUnits * SPREAD);
    const netMinorUnits = sourceAmount.minorUnits - feeMinorUnits;
    const targetMajor =
      (netMinorUnits / minorUnitFactor(sourceAmount.currency)) * appliedRate;

    return respond('fxService.quote', {
      id: `fxq_${Date.now()}`,
      from: sourceAmount.currency,
      to,
      rate: appliedRate,
      sourceAmount,
      targetAmount: {
        minorUnits: Math.round(targetMajor * minorUnitFactor(to)),
        currency: to,
      },
      fee: { minorUnits: feeMinorUnits, currency: sourceAmount.currency },
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
  },
};
