import type { BadgeTone } from '@/components/ui';
import type {
  Card,
  CardDeliveryStage,
  CardReplacementReason,
  CardStatus,
} from '@/types';

/** The one label each card state gets, everywhere it is shown. */
export const CARD_STATUS_LABELS: Record<CardStatus, string> = {
  active: 'Active',
  frozen: 'Frozen',
  pending: 'On its way',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

export const CARD_STATUS_TONES: Record<CardStatus, BadgeTone> = {
  active: 'success',
  frozen: 'neutral',
  pending: 'pending',
  expired: 'danger',
  cancelled: 'danger',
};

/** The same states on the dark card face, where the palette is inverted. */
export const CARD_STATUS_TONES_ON_DARK: Record<CardStatus, BadgeTone> = {
  active: 'onDark',
  frozen: 'neutral',
  pending: 'pending',
  expired: 'danger',
  cancelled: 'danger',
};

export const CARD_FORMAT_LABELS: Record<Card['format'], string> = {
  physical: 'Physical card',
  virtual: 'Virtual card',
};

export const DELIVERY_STAGE_LABELS: Record<CardDeliveryStage, string> = {
  ordered: 'Ordered',
  printing: 'Being printed',
  shipped: 'On its way to you',
  delivered: 'Delivered',
};

/** Delivery runs in this order, so a stage can be drawn as progress. */
export const DELIVERY_STAGES: readonly CardDeliveryStage[] = [
  'ordered',
  'printing',
  'shipped',
  'delivered',
];

export const REPLACEMENT_REASON_LABELS: Record<CardReplacementReason, string> = {
  lost: 'Lost',
  stolen: 'Stolen',
  damaged: 'Damaged',
  expired: 'Expired',
};

/**
 * Whether the card can pay for anything right now.
 *
 * The single answer the whole app uses, so a card can never look spendable on
 * one screen and be refused on another.
 */
export function canCardSpend(card: Card): boolean {
  return card.status === 'active';
}

/**
 * Why a card cannot be used, in the user's words. `undefined` when it can.
 *
 * A provider's own reason always wins — it is the only text that says what
 * actually happened to this card.
 */
export function cardBlockedReason(card: Card): string | undefined {
  if (canCardSpend(card)) return undefined;
  if (card.statusReason) return card.statusReason;
  switch (card.status) {
    case 'frozen':
      return 'All payments are blocked while this card is frozen.';
    case 'pending':
      return 'This card cannot be used until it arrives and is activated.';
    case 'expired':
      return 'This card has expired. Order a replacement to keep paying by card.';
    case 'cancelled':
      return 'This card was cancelled and cannot be used again.';
    case 'active':
      return undefined;
  }
}

/** True when the state is one the user can undo from the card screen. */
export function canUnfreeze(card: Card): boolean {
  return card.status === 'frozen';
}

/** True when the card is in a state a replacement would fix. */
export function canReplace(card: Card): boolean {
  return card.format === 'physical' && card.status !== 'pending';
}
