import {
  minorUnitFactor,
  type CurrencyCode,
  type Money,
  type TransactionDirection,
} from '@/types';

type CurrencyDisplay = {
  /** Glyph or code shown before the figure. */
  readonly prefix: string;
  /** Whether a space separates prefix and figure. */
  readonly spaced: boolean;
  /**
   * `always` — cents are always shown ($8,250.00).
   * `when-nonzero` — whole amounts drop them (SAR 15,200), matching the
   * approved design's treatment of code-prefixed currencies.
   */
  readonly fraction: 'always' | 'when-nonzero';
};

const DISPLAY: Record<CurrencyCode, CurrencyDisplay> = {
  USD: { prefix: '$', spaced: false, fraction: 'always' },
  EUR: { prefix: '€', spaced: false, fraction: 'always' },
  GBP: { prefix: '£', spaced: false, fraction: 'always' },
  SAR: { prefix: 'SAR', spaced: true, fraction: 'when-nonzero' },
  AED: { prefix: 'AED', spaced: true, fraction: 'when-nonzero' },
  EGP: { prefix: 'EGP', spaced: true, fraction: 'when-nonzero' },
};

/** U+2212. Typographic minus, not a hyphen — the design uses it throughout. */
export const MINUS = '−';

export type MoneyParts = {
  /** "$" or "SAR " — already carries its trailing space when spaced. */
  readonly prefix: string;
  /** Grouped whole part, e.g. "12,450". */
  readonly whole: string;
  /** ".00", or an empty string when the currency hides zero cents. */
  readonly fraction: string;
};

/**
 * Splits an amount into its display parts so the balance card can render the
 * cents smaller and in a different colour, as the design does.
 */
export function formatMoneyParts(value: Money): MoneyParts {
  const display = DISPLAY[value.currency];
  const factor = minorUnitFactor(value.currency);
  const absolute = Math.abs(value.minorUnits);
  const whole = Math.trunc(absolute / factor);
  const remainder = absolute % factor;

  const showFraction = display.fraction === 'always' || remainder !== 0;

  return {
    prefix: display.spaced ? `${display.prefix} ` : display.prefix,
    whole: whole.toLocaleString('en-US'),
    fraction: showFraction ? `.${String(remainder).padStart(2, '0')}` : '',
  };
}

/** "$12,450.00", "SAR 15,200". */
export function formatMoney(value: Money): string {
  const parts = formatMoneyParts(value);
  return `${parts.prefix}${parts.whole}${parts.fraction}`;
}

/** "+$4,500.00" / "−$850.00" — the transaction row treatment. */
export function formatSignedMoney(value: Money, direction: TransactionDirection): string {
  return `${direction === 'credit' ? '+' : MINUS}${formatMoney(value)}`;
}

/** "Aug 31" — the compact date used on cards and transaction rows. */
export function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(parse(iso));
}

/** "31 August 2026" — for detail screens. */
export function formatLongDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parse(iso));
}

/** "Good morning" / "Good afternoon" / "Good evening". */
export function greeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Whole-percentage share of a total, for "66% of total". */
export function percentageOf(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

function parse(iso: string): Date {
  // Date-only strings are parsed as UTC by the engine; adding midday keeps the
  // rendered day stable in every timezone.
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00` : iso);
}

/** "09:41" — 24-hour clock, as the design writes times. */
export function formatTimeOfDay(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(parse(iso));
}

/**
 * "Now" · "Today, 09:41" · "Yesterday, 18:04" · "14 Aug, 02:11" — the way the
 * design labels recent activity and support messages.
 */
export function formatRelativeDateTime(iso: string, now: Date = new Date()): string {
  const at = parse(iso);
  const time = formatTimeOfDay(iso);
  const days = calendarDaysBetween(at, now);

  if (days === 0) {
    const minutes = Math.round((now.getTime() - at.getTime()) / 60_000);
    if (minutes >= 0 && minutes < 2) return 'Now';
    return `Today, ${time}`;
  }
  if (days === 1) return `Yesterday, ${time}`;

  const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(at);
  return `${day}, ${time}`;
}

/** Whole calendar days between two instants, ignoring the time of day. */
function calendarDaysBetween(earlier: Date, later: Date): number {
  const a = Date.UTC(earlier.getFullYear(), earlier.getMonth(), earlier.getDate());
  const b = Date.UTC(later.getFullYear(), later.getMonth(), later.getDate());
  return Math.round((b - a) / 86_400_000);
}

/** "TODAY 09:38" — the divider above a day's messages in a conversation. */
export function formatDayDivider(iso: string, now: Date = new Date()): string {
  const days = calendarDaysBetween(parse(iso), now);
  if (days === 0) return `TODAY ${formatTimeOfDay(iso)}`;
  if (days === 1) return `YESTERDAY ${formatTimeOfDay(iso)}`;
  return `${formatShortDate(iso).toUpperCase()} ${formatTimeOfDay(iso)}`;
}
