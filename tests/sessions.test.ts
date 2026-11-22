import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lemo-sessions-'));
process.env.DEVPULSE_DATA_FILE = path.join(dir, 'data.json');

test('a token is accepted until its account signs out', async () => {
  const { db } = await import('../backend/db');
  const { signToken, verifyToken } = await import('../backend/middleware/auth');
  const userId = 'user-session-test';
  // Sign-up always stores a credential; sessions are tracked there.
  db.setCredential(userId, 'sessions@example.com', 'not-a-real-hash');

  const token = signToken({ userId, username: 'sessions' });
  assert.deepEqual(verifyToken(token), { userId, username: 'sessions' });

  db.revokeSessions(userId);
  assert.equal(verifyToken(token), null, 'the old token must stop working');

  const fresh = signToken({ userId, username: 'sessions' });
  assert.ok(verifyToken(fresh), 'a token issued after sign-out must work');
});

test('a tampered token is refused', async () => {
  const { signToken, verifyToken } = await import('../backend/middleware/auth');
  const token = signToken({ userId: 'user-tamper-test', username: 'tamper' });
  const [head, body, sig] = token.split('.');
  const forged = `${head}.${Buffer.from(JSON.stringify({ userId: 'someone-else', username: 'x', ver: 0 })).toString('base64url')}.${sig}`;
  assert.equal(verifyToken(forged), null);
  assert.equal(verifyToken(`${head}.${body}.wrong`), null);
});
