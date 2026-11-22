import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

process.env.LEMO_UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'lemo-images-'));
const png = 'data:image/png;base64,iVBORw0KGgo=';

test('profile and group photos must be common image formats', async () => {
  const { saveImage } = await import('../backend/uploads');
  assert.ok(saveImage(png, 'me.png'));
  assert.equal(saveImage('data:image/svg+xml;base64,PHN2Zz4=', 'x.svg'), undefined, 'SVG is refused');
  assert.equal(saveImage('data:text/html;base64,PGgxPg==', 'x.html'), undefined, 'HTML is refused');
});

test('only our own stored image URLs are accepted as avatars', async () => {
  const { isOwnImageUrl } = await import('../backend/uploads');
  assert.equal(isOwnImageUrl('/uploads/0123456789abcdef0123456789abcdef.png'), true);
  assert.equal(isOwnImageUrl('/uploads/../../etc/passwd'), false);
  assert.equal(isOwnImageUrl('https://evil.example/x.png'), false);
  assert.equal(isOwnImageUrl('😀'), false);
});
