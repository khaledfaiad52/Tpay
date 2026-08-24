import { useCallback } from 'react';

import { services } from '@/services';
import type { SupportArticle, SupportTopicSummary } from '@/services';
import type { SupportConversation } from '@/types';
import { useAsyncData, type AsyncResult } from './useAsyncData';

export type SupportData = {
  readonly conversations: readonly SupportConversation[];
  readonly topics: readonly SupportTopicSummary[];
  readonly articles: readonly SupportArticle[];
};

async function loadSupport(): Promise<SupportData> {
  const [conversations, topics, articles] = await Promise.all([
    services.support.listConversations(),
    services.support.listTopics(),
    services.support.listArticles(),
  ]);
  return { conversations, topics, articles };
}

/** Everything the one TPay Support surface shows. */
export function useSupportData(): AsyncResult<SupportData> {
  return useAsyncData(loadSupport);
}

async function loadTopics(): Promise<readonly SupportTopicSummary[]> {
  return services.support.listTopics();
}

/** The topics a new conversation can be filed under. */
export function useSupportTopics(): AsyncResult<readonly SupportTopicSummary[]> {
  return useAsyncData(loadTopics);
}

export function useConversation(conversationId: string): AsyncResult<SupportConversation> {
  const load = useCallback(
    () => services.support.getConversation(conversationId),
    [conversationId],
  );
  return useAsyncData(load);
}
