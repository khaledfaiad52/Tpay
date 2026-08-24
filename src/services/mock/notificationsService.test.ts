import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { NotFoundError } from '@/services/contracts';
import { configureMockBehaviour } from './latency';
import { mockNotificationsService, resetNotifications, unreadCount } from './notificationsService';

configureMockBehaviour({ latencyMs: 0, failureRate: 0 });

beforeEach(() => {
  resetNotifications();
});

const service = mockNotificationsService;

describe('notificationsService', () => {
  it('lists the newest first', async () => {
    const entries = await service.listNotifications();
    assert.ok(entries.length > 1);
    assert.ok(entries[0].occurredAt >= entries[1].occurredAt);
  });

  it('counts what is unread', async () => {
    assert.equal(unreadCount(await service.listNotifications()), 2);
  });

  it('marks one read', async () => {
    const entries = await service.listNotifications();
    const unread = entries.find((entry) => !entry.read)!;
    const after = await service.markRead(unread.id);
    assert.equal(after.find((entry) => entry.id === unread.id)?.read, true);
  });

  it('rejects an unknown notification', async () => {
    await assert.rejects(() => service.markRead('ntf_nope'), NotFoundError);
  });

  it('marks everything read at once', async () => {
    assert.equal(unreadCount(await service.markAllRead()), 0);
  });

  it('gives every notification somewhere to go', async () => {
    const entries = await service.listNotifications();
    assert.ok(entries.every((entry) => entry.target !== undefined));
  });

  it('uses icon names, never emoji, for its glyphs', async () => {
    const entries = await service.listNotifications();
    assert.ok(entries.every((entry) => /^[a-z-]+$/.test(entry.icon)));
  });
});
