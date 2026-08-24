import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { avatarToneIndex, AVATAR_TONE_COUNT } from './avatarTone';

describe('avatarToneIndex', () => {
  it('is stable for the same recipient', () => {
    assert.equal(avatarToneIndex('rcp_ahmed'), avatarToneIndex('rcp_ahmed'));
  });

  it('stays inside the palette', () => {
    for (const seed of ['a', 'rcp_ahmed', '', 'a much longer identifier than usual']) {
      const index = avatarToneIndex(seed);
      assert.ok(index >= 0 && index < AVATAR_TONE_COUNT, `${seed} → ${index}`);
    }
  });

  it('spreads ids that differ only in their tail', () => {
    // These clumped onto one colour under a plain hash.
    const seeds = ['rcp_ahmed', 'rcp_sara', 'rcp_mostafa', 'rcp_layla', 'rcp_omar'];
    const used = new Set(seeds.map(avatarToneIndex));
    assert.ok(used.size >= 3, `only ${used.size} of ${AVATAR_TONE_COUNT} tones used`);
  });
});
