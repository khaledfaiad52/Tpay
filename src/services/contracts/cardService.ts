import type { Card } from '@/types';

/**
 * The TPay Card spends from the wallet balance, so this service never reports
 * a balance of its own — only the card, its state and its spend.
 */
export type CardService = {
  /** `null` when the employer has not issued a card yet. */
  getCard(): Promise<Card | null>;
  freezeCard(cardId: string): Promise<Card>;
  unfreezeCard(cardId: string): Promise<Card>;
};
