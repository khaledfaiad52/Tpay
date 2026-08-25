import type {
  SupportConversation,
  SupportConversationDraft,
  SupportTopic,
} from '@/types';

/** A subject the help centre groups articles under. */
export type SupportTopicSummary = {
  readonly topic: SupportTopic;
  readonly label: string;
};

export type SupportArticle = {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
  readonly topic: SupportTopic;
};

/**
 * One TPay Support surface, wherever it is opened from.
 *
 * The employer screen, a benefit and the employment details all lead here, so
 * a conversation carries the topic it started from and support opens with
 * context rather than asking the user to repeat themselves.
 */
export type SupportService = {
  listConversations(): Promise<readonly SupportConversation[]>;
  getConversation(conversationId: string): Promise<SupportConversation>;
  /** Starts a conversation, already addressed to the right team. */
  startConversation(draft: SupportConversationDraft): Promise<SupportConversation>;
  sendMessage(conversationId: string, body: string): Promise<SupportConversation>;
  closeConversation(conversationId: string): Promise<SupportConversation>;
  listTopics(): Promise<readonly SupportTopicSummary[]>;
  listArticles(topic?: SupportTopic): Promise<readonly SupportArticle[]>;
};
