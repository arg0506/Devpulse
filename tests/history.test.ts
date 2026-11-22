import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

// The store reads its file path when it loads, so point it at a throwaway file first.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lemo-history-'));
process.env.DEVPULSE_DATA_FILE = path.join(dir, 'data.json');

test('history pages through a channel, newest first, without gaps or repeats', async () => {
  const { db } = await import('../backend/db');
  const channelId = 'general';
  const base = db.getRecentMessages(channelId, 100000).messages.length;

  for (let i = 0; i < 120; i++) {
    db.addMessage({
      id: `page-test-${i}`,
      channelId,
      userId: 'user-test',
      username: 'tester',
      role: 'Developer',
      avatarEmoji: '🧪',
      text: `message ${i}`,
      timestamp: new Date(2026, 0, 1, 0, 0, i).toISOString(),
      repliesCount: 0,
      reactions: [],
    });
  }

  const newest = db.getRecentMessages(channelId);
  assert.equal(newest.messages.length, 50);
  assert.equal(newest.hasMore, base + 120 > 50);
  assert.equal(newest.messages.at(-1)?.text, 'message 119');

  // Our 120 messages are the last 120 in the channel, so they are numbered 0..119.
  const older = db.getOlderMessages(channelId, newest.messages[0].id);
  assert.equal(older.messages.length, 50);
  assert.equal(older.messages[0].text, 'message 20');
  assert.equal(older.messages.at(-1)?.text, 'message 69');
  assert.equal(older.hasMore, true);

  // The page before "message 20" holds messages 0..19, plus any seeded history that came earlier.
  const oldest = db.getOlderMessages(channelId, older.messages[0].id);
  assert.equal(oldest.messages.at(-1)?.text, 'message 19');
  assert.equal(oldest.messages.length, Math.min(50, base + 20));
  assert.equal(oldest.hasMore, base + 20 > 50);
});

test('asking for history before an unknown message returns nothing', async () => {
  const { db } = await import('../backend/db');
  const result = db.getOlderMessages('general', 'no-such-message');
  assert.deepEqual(result, { messages: [], hasMore: false });
});
