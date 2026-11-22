import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedGifUrl, gifsEnabled } from '../backend/gifs';

test('only Tenor media hosts over https are accepted as GIFs', () => {
  assert.equal(isAllowedGifUrl('https://media.tenor.com/abc/cat.gif'), true);
  assert.equal(isAllowedGifUrl('https://media1.tenor.com/abc/cat.gif'), true);
  assert.equal(isAllowedGifUrl('http://media.tenor.com/abc/cat.gif'), false);
  assert.equal(isAllowedGifUrl('https://media.tenor.com.evil.example/cat.gif'), false);
  assert.equal(isAllowedGifUrl('https://evil.example/cat.gif'), false);
  assert.equal(isAllowedGifUrl('javascript:alert(1)'), false);
});

test('GIF search is off until a Tenor key is configured', () => {
  const saved = process.env.TENOR_API_KEY;
  delete process.env.TENOR_API_KEY;
  assert.equal(gifsEnabled(), false);
  process.env.TENOR_API_KEY = 'test-key';
  assert.equal(gifsEnabled(), true);
  if (saved === undefined) delete process.env.TENOR_API_KEY;
  else process.env.TENOR_API_KEY = saved;
});
