/** Who wrote a message in a support conversation. */
export type SupportAuthor = 'you' | 'agent';

export type SupportConversationStatus = 'open' | 'awaiting-you' | 'closed';

/** What the conversation is about, so support opens with context. */
export type SupportTopic =
  | 'employer'
  | 'benefits'
  | 'employment'
  | 'transfers'
  | 'salary'
  | 'account'
  | 'other';

export type SupportMessage = {
  readonly id: string;
  readonly author: SupportAuthor;
  readonly body: string;
  /** ISO-8601 timestamp. */
  readonly sentAt: string;
  /** A transfer, request or document the message refers to. */
  readonly attachment?: SupportAttachment;
};

/** A thing in the app that a message points at. */
export type SupportAttachment = {
  readonly label: string;
  readonly title: string;
  /** Where tapping it leads. */
  readonly kind: 'transfer' | 'request' | 'document';
  readonly targetId: string;
};

export type SupportAgent = {
  readonly name: string;
  readonly initials: string;
  /** "TPay support", so the employer of record is never the face of support. */
  readonly role: string;
  readonly online: boolean;
};

export type SupportConversation = {
  readonly id: string;
  readonly subject: string;
  readonly topic: SupportTopic;
  readonly status: SupportConversationStatus;
  readonly agent: SupportAgent;
  readonly messages: readonly SupportMessage[];
  /** ISO-8601 timestamp of the most recent message. */
  readonly updatedAt: string;
  readonly unread: boolean;
};

/** What starting a conversation needs. */
export type SupportConversationDraft = {
  readonly topic: SupportTopic;
  readonly subject: string;
  readonly message: string;
};
