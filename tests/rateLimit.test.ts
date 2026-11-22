import { test } from 'node:test';
import assert from 'node:assert/strict';
import { consume } from '../backend/middleware/rateLimit';

test('allows requests up to the limit, then refuses', () => {
  const store = new Map();
  const opts = { windowMs: 1000, max: 3 };
  assert.equal(consume(store, 'ip', opts, 0), true);
  assert.equal(consume(store, 'ip', opts, 1), true);
  assert.equal(consume(store, 'ip', opts, 2), true);
  assert.equal(consume(store, 'ip', opts, 3), false);
});

test('the window resets after it expires', () => {
  const store = new Map();
  const opts = { windowMs: 1000, max: 1 };
  assert.equal(consume(store, 'ip', opts, 0), true);
  assert.equal(consume(store, 'ip', opts, 500), false);
  assert.equal(consume(store, 'ip', opts, 1000), true);
});

test('each key is counted separately', () => {
  const store = new Map();
  const opts = { windowMs: 1000, max: 1 };
  assert.equal(consume(store, 'a', opts, 0), true);
  assert.equal(consume(store, 'b', opts, 0), true);
  assert.equal(consume(store, 'a', opts, 1), false);
});
