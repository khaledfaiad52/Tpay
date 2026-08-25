import type { KycState } from '@/services';
import type { IconName } from '@/icons';
import type { KycStatus } from '@/types';
import { formatLongDate } from '@/utils';

/** How a verification state should read and what it lets the user do next. */
export type KycTone = 'verified' | 'pending' | 'attention' | 'blocked' | 'todo';

export type KycAction = {
  readonly label: string;
  /** `verify` opens the verification flow; `support` opens TPay Support. */
  readonly target: 'verify' | 'support';
};

export type KycPresentation = {
  readonly headline: string;
  readonly detail: string;
  readonly badge: string;
  readonly tone: KycTone;
  readonly icon: IconName;
  readonly action?: KycAction;
};

const START: KycAction = { label: 'Start verification', target: 'verify' };
const CONTINUE: KycAction = { label: 'Continue verification', target: 'verify' };
const FINISH: KycAction = { label: 'Finish verification', target: 'verify' };
const SUPPORT: KycAction = { label: 'Contact TPay support', target: 'support' };

type Template = Omit<KycPresentation, 'detail'> & { readonly detail: string };

const TEMPLATES: Record<KycStatus, Template> = {
  NOT_STARTED: {
    headline: 'Verify your identity',
    detail:
      'Required by our banking partners before you can hold or move money without limits. ' +
      'Usually approved in under 5 minutes.',
    badge: 'Not started',
    tone: 'todo',
    icon: 'id-card',
    action: START,
  },
  IN_PROGRESS: {
    headline: 'Verification in progress',
    detail: 'Pick up where you left off. Your answers so far are saved.',
    badge: 'In progress',
    tone: 'pending',
    icon: 'id-card',
    action: CONTINUE,
  },
  SUBMITTED: {
    headline: 'Verification in review',
    detail:
      'Everything is with our verification partner. Most checks finish within a few minutes, ' +
      'and we will let you know as soon as it is done.',
    badge: 'In review',
    tone: 'pending',
    icon: 'help-circle',
  },
  ACTION_REQUIRED: {
    headline: 'One more thing needed',
    detail: 'Verification needs something more from you before it can finish.',
    badge: 'Action needed',
    tone: 'attention',
    icon: 'alert-triangle',
    action: FINISH,
  },
  VERIFIED: {
    headline: 'Identity verified',
    detail: 'Full account access.',
    badge: 'Verified',
    tone: 'verified',
    icon: 'shield-check',
  },
  REJECTED: {
    headline: 'Verification was declined',
    detail:
      'We could not verify your identity from what was submitted. TPay Support can tell you ' +
      'what to send instead.',
    badge: 'Declined',
    tone: 'blocked',
    icon: 'alert-triangle',
    action: SUPPORT,
  },
  SUSPENDED: {
    headline: 'Account under review',
    detail:
      'Sending and card payments are paused while TPay reviews your account. Support can tell ' +
      'you where the review has got to.',
    badge: 'Under review',
    tone: 'blocked',
    icon: 'alert-triangle',
    action: SUPPORT,
  },
};

/**
 * Turns a verification state into the one thing the screen should say.
 *
 * A provider's own reason, when it gives one, always beats the generic copy —
 * it is the only text that tells the user what to actually do.
 */
export function presentKyc(state: KycState): KycPresentation {
  const template = TEMPLATES[state.status];
  if (state.status === 'VERIFIED') {
    return { ...template, detail: `Full account access · verified ${formatLongDate(state.updatedAt)}` };
  }
  return state.reason ? { ...template, detail: state.reason } : template;
}
