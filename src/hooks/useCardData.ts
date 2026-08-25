import { useCallback } from 'react';

import { services } from '@/services';
import type { AccountState } from '@/services';
import type {
  Card,
  CardControls,
  CardReplacement,
  CardSpending,
  Money,
  Transaction,
} from '@/types';
import { useAsyncData, type AsyncResult } from './useAsyncData';

export type CardsData = {
  readonly cards: readonly Card[];
  /** Whether the account itself allows any card to be used. */
  readonly accountState: AccountState;
  /**
   * The one balance every card spends from. It comes from the wallet, because
   * there is no such thing as a card balance in TPay.
   */
  readonly availableBalance: Money;
};

async function loadCards(): Promise<CardsData> {
  const [cards, accountState, wallet] = await Promise.all([
    services.card.listCards(),
    services.security.getAccountState(),
    services.wallet.getBalance(),
  ]);
  return { cards, accountState, availableBalance: wallet.total };
}

/** Every card on the account, for the cards overview. */
export function useCardsData(): AsyncResult<CardsData> {
  return useAsyncData(loadCards);
}

export type CardDetailData = {
  readonly card: Card;
  readonly controls: CardControls;
  readonly spending: CardSpending;
  readonly transactions: readonly Transaction[];
  readonly accountState: AccountState;
  /** A replacement on its way, when one has been ordered. */
  readonly replacement: CardReplacement | null;
};

/**
 * One card and everything the card screen shows about it.
 *
 * `spending.availableBalance` is the shared wallet balance — the card has no
 * balance of its own to load.
 */
export function useCardDetail(cardId: string): AsyncResult<CardDetailData> {
  const load = useCallback(async (): Promise<CardDetailData> => {
    const card = await services.card.getCardById(cardId);
    const [controls, spending, transactions, accountState, replacement] = await Promise.all([
      services.card.getControls(cardId),
      services.card.getSpending(cardId),
      services.card.listCardTransactions(cardId),
      services.security.getAccountState(),
      services.card.getReplacement(cardId),
    ]);
    return { card, controls, spending, transactions, accountState, replacement };
  }, [cardId]);

  return useAsyncData(load);
}
