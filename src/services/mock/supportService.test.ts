import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { NotFoundError } from '@/services/contracts';
import type { SupportTopic } from '@/types';
import { configureMockBehaviour } from './latency';
import { mockSupportService, resetSupport } from './supportService';

configureMockBehaviour({ latencyMs: 0, failureRate: 0 });

beforeEach(() => {
  resetSupport();
});

const service = mockSupportService;

describe('supportService conversations', () => {
  it('lists the newest conversation first', async () => {
    const conversations = await service.listConversations();
    assert.ok(conversations.length >= 2);
    assert.ok(conversations[0].updatedAt >= conversations[1].updatedAt);
  });

  it('marks a conversation read once it is opened', async () => {
    const [first] = await service.listConversations();
    assert.equal(first.unread, true);
    const opened = await service.getConversation(first.id);
    assert.equal(opened.unread, false);
  });

  it('rejects an unknown conversation', async () => {
    await assert.rejects(() => service.getConversation('sup_nope'), NotFoundError);
  });

  it('never puts a provider name in front of the user', async () => {
    const conversations = await service.listConversations();
    const text = JSON.stringify(conversations);
    assert.doesNotMatch(text, /airwallex|thunes|nium|terrapay/i);
  });

  it('names TPay support, not the employer of record, as the agent', async () => {
    const [first] = await service.listConversations();
    assert.equal(first.agent.role, 'TPay support');
  });
});

describe('supportService entry points', () => {
  const ENTRY_POINTS: readonly SupportTopic[] = ['employer', 'benefits', 'employment'];

  for (const topic of ENTRY_POINTS) {
    it(`opens one surface for the ${topic} entry point`, async () => {
      const conversation = await service.startConversation({
        topic,
        subject: `Question about ${topic}`,
        message: 'Can you help with this?',
      });
      assert.equal(conversation.topic, topic);
      // The user's own message, then support answering with context.
      assert.equal(conversation.messages.length, 2);
      assert.equal(conversation.messages[0].author, 'you');
      assert.equal(conversation.messages[1].author, 'agent');
      assert.ok(conversation.messages[1].body.length > 0);
    });
  }

  it('puts a new conversation at the top of the list', async () => {
    const started = await service.startConversation({
      topic: 'transfers',
      subject: 'Where is my money?',
      message: 'The transfer has not arrived.',
    });
    const [first] = await service.listConversations();
    assert.equal(first.id, started.id);
  });
});

describe('supportService messages', () => {
  it('appends a reply and moves the conversation forward', async () => {
    const [first] = await service.listConversations();
    const before = first.messages.length;
    const after = await service.sendMessage(first.id, 'The last six digits are 004821.');
    assert.equal(after.messages.length, before + 1);
    assert.equal(after.messages.at(-1)?.author, 'you');
    assert.ok(after.updatedAt >= first.updatedAt);
  });

  it('refuses to reply to a closed conversation', async () => {
    const conversations = await service.listConversations();
    const closed = conversations.find((conversation) => conversation.status === 'closed')!;
    await assert.rejects(() => service.sendMessage(closed.id, 'One more thing'));
  });

  it('closes a conversation', async () => {
    const [first] = await service.listConversations();
    assert.equal((await service.closeConversation(first.id)).status, 'closed');
  });

  it('links a failed transfer from the message that explains it', async () => {
    const conversations = await service.listConversations();
    const withAttachment = conversations
      .flatMap((conversation) => conversation.messages)
      .find((message) => message.attachment !== undefined);
    assert.equal(withAttachment?.attachment?.kind, 'transfer');
  });
});

describe('supportService help centre', () => {
  it('offers every topic the app links from', async () => {
    const topics = (await service.listTopics()).map((topic) => topic.topic);
    for (const expected of ['transfers', 'salary', 'account', 'employer', 'benefits', 'employment']) {
      assert.ok(topics.includes(expected as SupportTopic), `missing ${expected}`);
    }
  });

  it('filters articles by topic', async () => {
    const articles = await service.listArticles('salary');
    assert.ok(articles.length > 0);
    assert.ok(articles.every((article) => article.topic === 'salary'));
  });

  it('explains why limits exist without naming a provider', async () => {
    const articles = await service.listArticles('account');
    assert.ok(articles.some((article) => /verification/i.test(article.answer)));
  });
});
