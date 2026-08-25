/** How many grounds the recipient palette offers. */
export const AVATAR_TONE_COUNT = 4;

/**
 * Picks a stable colour for a recipient.
 *
 * FNV-1a with a final avalanche. Recipient ids differ only in their tail
 * ("rcp_ahmed", "rcp_sara"), and a plain hash leaves that difference in the
 * high bits — so everyone came out the same colour. Mixing the high bits down
 * spreads them properly.
 */
export function avatarToneIndex(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x2545f491) >>> 0;
  hash ^= hash >>> 13;
  return (hash >>> 0) % AVATAR_TONE_COUNT;
}
