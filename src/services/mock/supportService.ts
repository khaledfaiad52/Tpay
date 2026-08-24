import { NotFoundError } from '@/services/contracts';
import type { SupportService, SupportTopicSummary } from '@/services/contracts';
import type { SupportConversation, SupportMessage, SupportTopic } from '@/types';
import { mockArticles, mockConversations, mockSupportAgent } from './data/fixtures';
import { respond } from './latency';

/** The subjects the help centre groups by, in the order it shows them. */
const TOPICS: readonly SupportTopicSummary[] = [
  { topic: 'transfers', label: 'Transfers' },
  { topic: 'salary', label: 'Salary' },
  { topic: 'account', label: 'Account' },
  { topic: 'employer', label: 'Employer' },
  { topic: 'benefits', label: 'Benefits' },
  { topic: 'employment', label: 'Employment' },
];

/** What support opens with when a conversation starts from a given screen. */
const OPENING_LINE: Record<SupportTopic, string> = {
  employer:
    "Thanks for getting in touch. I can see your employment with Acme Technologies — what would you like to know?",
  benefits:
    "Thanks for getting in touch. I can see your benefits — tell me which one you'd like help with.",
  employment:
    'Thanks for getting in touch. I have your employment details in front of me — how can I help?',
  transfers: 'Thanks for getting in touch. Tell me which transfer this is about and I will take a look.',
  salary: 'Thanks for getting in touch. I can see your payroll history — what would you like to check?',
  account: 'Thanks for getting in touch. How can I help with your account?',
  other: 'Thanks for getting in touch. How can I help?',
};

let conversations: SupportConversation[] = mockConversations.map((conversation) => ({
  ...conversation,
}));
let nextId = 9100;

function replace(updated: SupportConversation): SupportConversation {
  conversations = conversations.map((candidate) =>
    candidate.id === updated.id ? updated : candidate,
  );
  return updated;
}

function find(conversationId: string): SupportConversation | undefined {
  return conversations.find((candidate) => candidate.id === conversationId);
}

export const mockSupportService: SupportService = {
  listConversations: () =>
    respond(
      'supportService.listConversations',
      [...conversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    ),

  getConversation: (conversationId) => {
    const conversation = find(conversationId);
    if (!conversation) return Promise.reject(new NotFoundError('Conversation', conversationId));
    // Opening a conversation is what marks it read.
    return respond('supportService.getConversation', replace({ ...conversation, unread: false }));
  },

  startConversation: (draft) => {
    nextId += 1;
    const now = new Date().toISOString();
    const conversation: SupportConversation = {
      id: `sup_${nextId}`,
      subject: draft.subject,
      topic: draft.topic,
      status: 'open',
      agent: mockSupportAgent,
      updatedAt: now,
      unread: false,
      messages: [
        { id: `msg_${nextId}_1`, author: 'you', body: draft.message, sentAt: now },
        {
          id: `msg_${nextId}_2`,
          author: 'agent',
          body: OPENING_LINE[draft.topic],
          sentAt: now,
        },
      ],
    };
    conversations = [conversation, ...conversations];
    return respond('supportService.startConversation', conversation);
  },

  sendMessage: (conversationId, body) => {
    const conversation = find(conversationId);
    if (!conversation) return Promise.reject(new NotFoundError('Conversation', conversationId));
    if (conversation.status === 'closed') {
      return Promise.reject(new Error('This conversation is closed. Start a new one to continue.'));
    }

    const message: SupportMessage = {
      id: `msg_${Date.now()}`,
      author: 'you',
      body,
      sentAt: new Date().toISOString(),
    };
    return respond(
      'supportService.sendMessage',
      replace({
        ...conversation,
        messages: [...conversation.messages, message],
        updatedAt: message.sentAt,
        // The ball is with support until they reply.
        status: 'open',
      }),
    );
  },

  closeConversation: (conversationId) => {
    const conversation = find(conversationId);
    if (!conversation) return Promise.reject(new NotFoundError('Conversation', conversationId));
    return respond(
      'supportService.closeConversation',
      replace({ ...conversation, status: 'closed', updatedAt: new Date().toISOString() }),
    );
  },

  listTopics: () => respond('supportService.listTopics', TOPICS),

  listArticles: (topic?: SupportTopic) =>
    respond(
      'supportService.listArticles',
      topic ? mockArticles.filter((article) => article.topic === topic) : mockArticles,
    ),
};

export function resetSupport(): void {
  conversations = mockConversations.map((conversation) => ({ ...conversation }));
  nextId = 9100;
}

export { TOPICS as supportTopics };
