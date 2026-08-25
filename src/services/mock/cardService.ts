import {
  CardDeclinedError,
  InsufficientFundsError,
  NotFoundError,
  ProviderUnavailableError,
  type CardAuthorization,
  type CardControlsUpdate,
  type CardDeclineCode,
  type CardLimitsUpdate,
  type CardPurchaseRequest,
  type CardService,
} from '@/services/contracts';
import {
  convertMoney,
  fromMajor,
  negate,
  type Card,
  type CardControls,
  type CardDeliveryStage,
  type CardReplacement,
  type CardReplacementReason,
  type CardSecrets,
  type CardSpendCategory,
  type CardSpending,
  type Money,
  type Transaction,
} from '@/types';
import { accountRestrictionError } from './accountGuard';
import { runOnce } from './idempotency';
import {
  mockCardCategories,
  mockCardControls,
  mockCardLimits,
  mockCards,
} from './data/fixtures';
import {
  adjustBalance,
  findAccount,
  findAccountByCurrency,
  getAccounts,
  getTransactions,
  recordTransactions,
} from './data/store';
import { rateBetween } from './fxService';
import { respond } from './latency';
import { totalBalanceOf } from './walletService';

/**
 * What an issuer's own vocabulary means to TPay.
 *
 * Every card adapter owns a table like this, so the app only ever sees a
 * `CardStatus` — never a processor's status string, and never its name.
 */
const PROVIDER_CARD_STATUS_MAP: Record<string, Card['status']> = {
  produced: 'pending',
  printing: 'pending',
  shipped: 'pending',
  delivered: 'pending',
  activated: 'active',
  active: 'active',
  blocked: 'frozen',
  suspended: 'frozen',
  expired: 'expired',
  closed: 'cancelled',
  terminated: 'cancelled',
};

/** Which delivery stage a provider status corresponds to, when it names one. */
const PROVIDER_DELIVERY_MAP: Record<string, CardDeliveryStage> = {
  produced: 'printing',
  printing: 'printing',
  shipped: 'shipped',
  delivered: 'delivered',
};

/** Card events already applied, by the provider's event id. */
const appliedEvents = new Set<string>();

/** How many virtual cards the account may hold at once, as the design says. */
const MAX_VIRTUAL_CARDS = 5;

/** How long a revealed set of card credentials stays valid. */
const REVEAL_TTL_MS = 60_000;

/** The one currency card spending is reported in. */
const SPEND_CURRENCY = 'USD' as const;

type Limits = { monthlyLimit: Money; atmDailyLimit: Money };

let cards: Card[] = mockCards.map((card) => ({ ...card }));
let controls: Record<string, CardControls> = { ...mockCardControls };
let limits: Record<string, Limits> = defaultLimits(mockCards);
let replacements: CardReplacement[] = [];
let nextCardNumber = 1;

function defaultLimits(source: readonly Card[]): Record<string, Limits> {
  return Object.fromEntries(
    source.map((card) => [
      card.id,
      { monthlyLimit: mockCardLimits.monthly, atmDailyLimit: mockCardLimits.atmDaily },
    ]),
  );
}

function find(cardId: string): Card | undefined {
  return cards.find((card) => card.id === cardId);
}

function replace(updated: Card): Card {
  cards = cards.map((card) => (card.id === updated.id ? updated : card));
  return updated;
}

/**
 * The card's own rows from the shared ledger.
 *
 * There is exactly one ledger: card activity is tagged with `cardId` and read
 * back out of it, never kept somewhere separate.
 */
function transactionsFor(cardId: string): readonly Transaction[] {
  return getTransactions().filter((entry) => entry.cardId === cardId);
}

/** Month-to-date card spend, in the reporting currency. */
function spentThisMonth(cardId: string): Money {
  const month = new Date().toISOString().slice(0, 7);
  const minorUnits = transactionsFor(cardId)
    .filter((entry) => entry.status !== 'failed')
    .filter((entry) => entry.direction === 'debit')
    .filter((entry) => entry.occurredAt.slice(0, 7) === month)
    .reduce((total, entry) => total + inSpendCurrency(entry.amount).minorUnits, 0);
  return { minorUnits, currency: SPEND_CURRENCY };
}

function inSpendCurrency(amount: Money): Money {
  return convertMoney(amount, SPEND_CURRENCY, rateBetween(amount.currency, SPEND_CURRENCY));
}

/**
 * Which control, if any, forbids this purchase.
 *
 * A frozen, pending, expired or cancelled card is refused before any control
 * is consulted — the card's state outranks the switches.
 */
export function declineReason(
  card: Card,
  cardControls: CardControls,
  request: CardPurchaseRequest,
): CardDeclinedError | undefined {
  const stateDecline: Partial<Record<Card['status'], [CardDeclineCode, string, string]>> = {
    frozen: [
      'card-frozen',
      'This card is frozen, so the payment was declined.',
      'Unfreeze the card to start paying with it again.',
    ],
    pending: [
      'card-pending',
      'This card has not arrived yet, so it cannot be used.',
      'Activate it once it reaches you.',
    ],
    expired: [
      'card-expired',
      'This card has expired, so the payment was declined.',
      'Order a replacement card.',
    ],
    cancelled: [
      'card-cancelled',
      'This card was cancelled and cannot be used.',
      'Order a replacement card.',
    ],
  };

  const state = stateDecline[card.status];
  if (state) return new CardDeclinedError(state[0], state[1], state[2]);

  if (request.online && !cardControls.onlinePayments) {
    return new CardDeclinedError(
      'online-payments-off',
      'Online payments are turned off for this card.',
      'Turn on online payments in card settings.',
    );
  }
  if (request.atm && !cardControls.atmWithdrawals) {
    return new CardDeclinedError(
      'atm-withdrawals-off',
      'ATM withdrawals are turned off for this card.',
      'Turn on ATM withdrawals in card settings.',
    );
  }
  if (request.international && !cardControls.internationalPayments) {
    return new CardDeclinedError(
      'international-payments-off',
      'International payments are turned off for this card.',
      'Turn on international payments in card settings.',
    );
  }
  return undefined;
}

export const mockCardService: CardService = {
  listCards: () =>
    respond('cardService.listCards', [...cards].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))),

  getCardById: (cardId) => {
    const card = find(cardId);
    if (!card) return Promise.reject(new NotFoundError('Card', cardId));
    return respond('cardService.getCardById', card);
  },

  getCard: () =>
    respond('cardService.getCard', cards.find((card) => card.isPrimary) ?? cards[0] ?? null),

  createVirtualCard: () => {
    const existing = cards.filter(
      (card) => card.format === 'virtual' && card.status !== 'cancelled',
    );
    if (existing.length >= MAX_VIRTUAL_CARDS) {
      return Promise.reject(
        new Error(`You can hold up to ${MAX_VIRTUAL_CARDS} virtual cards at a time.`),
      );
    }

    nextCardNumber += 1;
    const holder = cards[0]?.holderName ?? 'TPay Cardholder';
    const card: Card = {
      id: `card_virtual_${nextCardNumber}`,
      format: 'virtual',
      status: 'active',
      // Masked demo tail — no card number in this codebase is real.
      last4: String(4000 + nextCardNumber * 7).slice(-4),
      holderName: holder,
      expiry: '04/30',
      network: 'visa',
      monthToDateSpend: fromMajor(0, SPEND_CURRENCY),
      isPrimary: false,
    };
    cards = [...cards, card];
    controls = {
      ...controls,
      [card.id]: {
        onlinePayments: true,
        atmWithdrawals: false,
        internationalPayments: true,
        contactlessPayments: false,
      },
    };
    limits = {
      ...limits,
      [card.id]: {
        monthlyLimit: mockCardLimits.monthly,
        atmDailyLimit: mockCardLimits.atmDaily,
      },
    };
    return respond('cardService.createVirtualCard', card);
  },

  freezeCard: (cardId) => {
    const card = find(cardId);
    if (!card) return Promise.reject(new NotFoundError('Card', cardId));
    if (card.status !== 'active' && card.status !== 'frozen') {
      return Promise.reject(
        new Error('Only an active card can be frozen.'),
      );
    }
    return respond(
      'cardService.freezeCard',
      replace({ ...card, status: 'frozen', statusReason: undefined }),
    );
  },

  unfreezeCard: (cardId) => {
    const card = find(cardId);
    if (!card) return Promise.reject(new NotFoundError('Card', cardId));
    if (card.status !== 'frozen') {
      return Promise.reject(new Error('That card is not frozen.'));
    }
    // The account-level restriction outranks the card's own: unfreezing a
    // card while the account itself cannot spend would be a lie.
    const restricted = accountRestrictionError();
    if (restricted) return Promise.reject(restricted);
    return respond(
      'cardService.unfreezeCard',
      replace({ ...card, status: 'active', statusReason: undefined }),
    );
  },

  revealCardDetails: (cardId, authorization: CardAuthorization) => {
    const card = find(cardId);
    if (!card) return Promise.reject(new NotFoundError('Card', cardId));
    if (card.status === 'cancelled') {
      return Promise.reject(
        new CardDeclinedError('card-cancelled', 'A cancelled card has no usable details.'),
      );
    }
    if (!authorization.method) {
      return Promise.reject(new Error('Card details need to be authorized first.'));
    }
    // Demo credentials, generated on demand and never stored, so nothing
    // long-lived in this app holds a full card number.
    const secrets: CardSecrets = {
      pan: `4271 8842 9910 ${card.last4}`,
      expiry: card.expiry,
      cvv: String(100 + (Number(card.last4) % 900)),
      expiresAt: new Date(Date.now() + REVEAL_TTL_MS).toISOString(),
    };
    return respond('cardService.revealCardDetails', secrets);
  },

  getControls: (cardId) => {
    const current = controls[cardId];
    if (!current) return Promise.reject(new NotFoundError('Card', cardId));
    return respond('cardService.getControls', current);
  },

  updateControls: (cardId, update: CardControlsUpdate) => {
    const current = controls[cardId];
    if (!current) return Promise.reject(new NotFoundError('Card', cardId));
    const card = find(cardId);
    if (card?.format === 'virtual' && (update.atmWithdrawals || update.contactlessPayments)) {
      return Promise.reject(
        new Error('A virtual card has no plastic, so it cannot be used at an ATM or in person.'),
      );
    }
    const next = { ...current, ...update };
    controls = { ...controls, [cardId]: next };
    return respond('cardService.updateControls', next);
  },

  getSpending: (cardId) => {
    const card = find(cardId);
    if (!card) return Promise.reject(new NotFoundError('Card', cardId));
    return respond('cardService.getSpending', spendingFor(card));
  },

  updateLimits: (cardId, update: CardLimitsUpdate) => {
    const card = find(cardId);
    const current = limits[cardId];
    if (!card || !current) return Promise.reject(new NotFoundError('Card', cardId));
    limits = {
      ...limits,
      [cardId]: {
        monthlyLimit: update.monthlyLimit ?? current.monthlyLimit,
        atmDailyLimit: update.atmDailyLimit ?? current.atmDailyLimit,
      },
    };
    return respond('cardService.updateLimits', spendingFor(card));
  },

  listCardTransactions: (cardId) => {
    if (!find(cardId)) return Promise.reject(new NotFoundError('Card', cardId));
    return respond(
      'cardService.listCardTransactions',
      [...transactionsFor(cardId)].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
    );
  },

  authorizePurchase: (request) => {
    // A processor that redelivers an authorisation must not debit the wallet
    // a second time; the same key returns the original transaction.
    return runOnce('card.authorize', request.idempotencyKey, request, () => {
      // The account gate comes first: a freeze or a blocked verification stops
      // every card at once, whatever any individual card says.
      const restricted = accountRestrictionError();
      if (restricted) return Promise.reject(restricted);

      const card = find(request.cardId);
      if (!card) return Promise.reject(new NotFoundError('Card', request.cardId));

      const cardControls = controls[card.id];
      if (!cardControls) return Promise.reject(new NotFoundError('Card controls', card.id));

      const declined = declineReason(card, cardControls, request);
      if (declined) return Promise.reject(declined);

      const limit = limits[card.id];
      const spend = inSpendCurrency(request.amount);
      if (limit) {
        const afterwards = spentThisMonth(card.id).minorUnits + spend.minorUnits;
        if (afterwards > limit.monthlyLimit.minorUnits) {
          return Promise.reject(
            new CardDeclinedError(
              'monthly-limit-reached',
              'This payment would take the card over its monthly spending limit.',
              'Raise the monthly limit in card settings.',
            ),
          );
        }
        if (request.atm && spend.minorUnits > limit.atmDailyLimit.minorUnits) {
          return Promise.reject(
            new CardDeclinedError(
              'atm-limit-reached',
              'That is more than the daily ATM limit on this card.',
              'Raise the ATM limit in card settings.',
            ),
          );
        }
      }

      // The card spends the wallet balance — the same one every other screen
      // shows. There is no card float to draw down.
      const account =
        findAccountByCurrency(request.amount.currency) ??
        getAccounts().find((candidate) => candidate.isPrimary);
      if (!account) return Promise.reject(new NotFoundError('Account', request.amount.currency));

      const settling = findAccount(account.id)!;
      if (settling.balance.minorUnits < request.amount.minorUnits) {
        return Promise.reject(
          new InsufficientFundsError('Your TPay balance does not cover that payment.'),
        );
      }

      const transaction: Transaction = {
        id: `txn_card_${Date.now()}`,
        type: 'card',
        direction: 'debit',
        description: request.merchant,
        amount: request.amount,
        occurredAt: new Date().toISOString(),
        status: 'completed',
        accountId: settling.id,
        cardId: card.id,
        merchantCategory: request.atm ? 'Cash' : 'Everything else',
        reference: `TPY-CRD-${String(Date.now()).slice(-4)}`,
      };

      adjustBalance(settling.id, negate(request.amount));
      recordTransactions([transaction]);
      replace({ ...card, monthToDateSpend: spentThisMonth(card.id) });

      return respond('cardService.authorizePurchase', transaction);
    });
  },

  reportLostOrStolen: (cardId, reason: CardReplacementReason) => {
    const card = find(cardId);
    if (!card) return Promise.reject(new NotFoundError('Card', cardId));
    if (card.status === 'cancelled') {
      return Promise.reject(new Error('That card was already cancelled.'));
    }

    replace({
      ...card,
      status: 'cancelled',
      statusReason:
        reason === 'expired'
          ? 'This card expired and was replaced.'
          : `Reported ${reason}. This card was cancelled so it cannot be used.`,
    });

    const orderedAt = new Date().toISOString();
    const replacement: CardReplacement = {
      id: `rep_${Date.now()}`,
      replacesCardId: card.id,
      reason,
      orderedAt,
      delivery: {
        stage: 'ordered',
        estimatedArrival: addDays(orderedAt, 5),
        addressSummary: 'DEMO 4417 Olaya Street, Riyadh',
      },
    };
    replacements = [replacement, ...replacements];

    // Only a physical card is posted; a virtual replacement is instant.
    if (card.format === 'physical') {
      nextCardNumber += 1;
      const issued: Card = {
        ...card,
        id: `card_physical_${nextCardNumber}`,
        status: 'pending',
        statusReason: undefined,
        last4: String(5000 + nextCardNumber * 13).slice(-4),
        monthToDateSpend: fromMajor(0, SPEND_CURRENCY),
        delivery: replacement.delivery,
      };
      cards = [...cards, issued];
      controls = { ...controls, [issued.id]: controls[card.id]! };
      limits = { ...limits, [issued.id]: limits[card.id]! };
      replacements = replacements.map((entry) =>
        entry.id === replacement.id ? { ...entry, replacementCardId: issued.id } : entry,
      );
      return respond('cardService.reportLostOrStolen', {
        ...replacement,
        replacementCardId: issued.id,
      });
    }

    return respond('cardService.reportLostOrStolen', replacement);
  },

  getReplacement: (cardId) =>
    respond(
      'cardService.getReplacement',
      replacements.find(
        (entry) => entry.replacesCardId === cardId || entry.replacementCardId === cardId,
      ) ?? null,
    ),

  handleCardCallback: ({ eventId, cardId, providerStatus, reason }) => {
    const card = find(cardId);
    if (!card) return Promise.reject(new NotFoundError('Card', cardId));

    // A redelivered event must not reopen a cancelled card or re-run a stage.
    if (eventId && appliedEvents.has(eventId)) {
      return respond('cardService.handleCardCallback', card);
    }

    const status = PROVIDER_CARD_STATUS_MAP[providerStatus];
    if (!status) {
      return Promise.reject(
        new ProviderUnavailableError(
          'That card update could not be read. Nothing has changed.',
          'card.callback',
        ),
      );
    }

    // A cancelled card is final; nothing an issuer says brings it back.
    if (card.status === 'cancelled') {
      if (eventId) appliedEvents.add(eventId);
      return respond('cardService.handleCardCallback', card);
    }

    const stage = PROVIDER_DELIVERY_MAP[providerStatus];
    const updated = replace({
      ...card,
      status,
      statusReason: reason ?? card.statusReason,
      delivery:
        stage && card.delivery
          ? { ...card.delivery, stage }
          : status === 'active'
            ? undefined
            : card.delivery,
    });
    if (eventId) appliedEvents.add(eventId);
    return respond('cardService.handleCardCallback', updated);
  },

  activateCard: (cardId, authorization: CardAuthorization) => {
    const card = find(cardId);
    if (!card) return Promise.reject(new NotFoundError('Card', cardId));
    if (card.status !== 'pending') {
      return Promise.reject(new Error('Only a card that is on its way can be activated.'));
    }
    if (!authorization.method) {
      return Promise.reject(new Error('Activating a card needs to be authorized first.'));
    }
    return respond(
      'cardService.activateCard',
      replace({ ...card, status: 'active', delivery: undefined }),
    );
  },
};

/** Spend, limits and the shared balance the card draws on. */
function spendingFor(card: Card): CardSpending {
  const limit = limits[card.id] ?? {
    monthlyLimit: mockCardLimits.monthly,
    atmDailyLimit: mockCardLimits.atmDaily,
  };
  return {
    monthToDate: spentThisMonth(card.id),
    monthlyLimit: limit.monthlyLimit,
    atmDailyLimit: limit.atmDailyLimit,
    // The one wallet balance, not a card float.
    availableBalance: totalBalanceOf(getAccounts()),
    categories: categoriesFor(card.id),
  };
}

/** Month-to-date spend grouped the way the card screen shows it. */
function categoriesFor(cardId: string): readonly CardSpendCategory[] {
  const month = new Date().toISOString().slice(0, 7);
  const live = transactionsFor(cardId)
    .filter((entry) => entry.status !== 'failed' && entry.direction === 'debit')
    .filter((entry) => entry.occurredAt.slice(0, 7) === month);

  if (live.length === 0) return mockCardCategories[cardId] ?? [];

  const totals = new Map<string, number>();
  for (const entry of live) {
    const label = entry.merchantCategory ?? 'Everything else';
    totals.set(label, (totals.get(label) ?? 0) + inSpendCurrency(entry.amount).minorUnits);
  }
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, minorUnits]) => ({ label, amount: { minorUnits, currency: SPEND_CURRENCY } }));
}

function addDays(iso: string, days: number): string {
  return new Date(Date.parse(iso) + days * 86_400_000).toISOString().slice(0, 10);
}

export function resetCards(): void {
  appliedEvents.clear();
  cards = mockCards.map((card) => ({ ...card }));
  controls = { ...mockCardControls };
  limits = defaultLimits(mockCards);
  replacements = [];
  nextCardNumber = 1;
}
