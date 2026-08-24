import { NotFoundError } from '@/services/contracts';
import type { CardService } from '@/services/contracts';
import type { Card } from '@/types';
import { mockCard } from './data/fixtures';
import { respond } from './latency';

/** Card state is mutable within a session so freeze/unfreeze is observable. */
let card: Card = mockCard;

function setStatus(cardId: string, status: Card['status'], operation: string): Promise<Card> {
  if (cardId !== card.id) return Promise.reject(new NotFoundError('Card', cardId));
  card = { ...card, status };
  return respond(operation, card);
}

export const mockCardService: CardService = {
  getCard: () => respond('cardService.getCard', card),
  freezeCard: (cardId) => setStatus(cardId, 'frozen', 'cardService.freezeCard'),
  unfreezeCard: (cardId) => setStatus(cardId, 'active', 'cardService.unfreezeCard'),
};
