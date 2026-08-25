import type { Recipient } from '@/services';

/**
 * How a recipient's destination reads back to the user.
 *
 * Account numbers are shown as a masked tail — long enough to recognise, short
 * enough to scan — while handles a person chose (a username, a phone number)
 * are shown as they were entered, because that is what they check against.
 */
export function formatRecipientHandle(recipient: Recipient): string {
  const isAccountNumber =
    recipient.kind === 'bank-account' || recipient.kind === 'international';
  return isAccountNumber ? maskTail(recipient.handle) : recipient.handle;
}

/** "AE12 0260 0010 2233 4455 667" → "••5667". */
export function maskTail(value: string, visible = 4): string {
  const compact = value.replace(/[^A-Za-z0-9]/g, '');
  if (compact.length <= visible) return compact;
  return `••${compact.slice(-visible)}`;
}

/** "Emirates NBD ••5667" — institution first, destination second. */
export function formatRecipientDestination(recipient: Recipient): string {
  const handle = formatRecipientHandle(recipient);
  return recipient.institution ? `${recipient.institution} ${handle}` : handle;
}
