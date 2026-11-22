import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lemo-uploads-'));
process.env.LEMO_UPLOAD_DIR = path.join(root, 'uploads');

const png = 'data:image/png;base64,iVBORw0KGgo=';

test('a valid data URL is written to disk under a random name', async () => {
  const { saveUpload, UPLOAD_DIR } = await import('../backend/uploads');
  const stored = saveUpload(png, 'pic.png', 'image/png');
  assert.ok(stored, 'expected a stored file');
  assert.match(stored.url, /^\/uploads\/[a-f0-9]{32}\.png$/);
  assert.equal(stored.name, 'pic.png');
  const written = fs.readFileSync(path.join(UPLOAD_DIR, path.basename(stored.url)));
  assert.equal(written.toString('base64'), 'iVBORw0KGgo=');
});

test('anything that is not a base64 data URL is refused', async () => {
  const { saveUpload } = await import('../backend/uploads');
  assert.equal(saveUpload('not a data url', 'x.txt', 'text/plain'), undefined);
  assert.equal(saveUpload('data:text/plain,hello', 'x.txt', 'text/plain'), undefined);
  assert.equal(saveUpload('data:text/plain;base64,', 'x.txt', 'text/plain'), undefined);
});

test('files over the size limit are refused', async () => {
  const { saveUpload, MAX_UPLOAD_BYTES } = await import('../backend/uploads');
  const big = Buffer.alloc(MAX_UPLOAD_BYTES + 1, 1).toString('base64');
  assert.equal(saveUpload(`data:application/zip;base64,${big}`, 'big.zip', 'application/zip'), undefined);
});

test('unknown types are stored as .bin so they can only download', async () => {
  const { saveUpload } = await import('../backend/uploads');
  const stored = saveUpload('data:application/x-weird;base64,AAEC', 'data', 'application/x-weird');
  assert.ok(stored);
  assert.match(stored.url, /\.bin$/);
});

test('deleting a stored file removes it', async () => {
  const { saveUpload, deleteUpload, UPLOAD_DIR } = await import('../backend/uploads');
  const stored = saveUpload(png, 'gone.png', 'image/png');
  assert.ok(stored);
  const file = path.join(UPLOAD_DIR, path.basename(stored.url));
  assert.equal(fs.existsSync(file), true);
  deleteUpload(stored.url);
  assert.equal(fs.existsSync(file), false);
});

test('deleting never touches files outside the uploads folder', async () => {
  const { deleteUpload } = await import('../backend/uploads');
  const outside = path.join(root, 'keep-me.txt');
  fs.writeFileSync(outside, 'important');
  deleteUpload('/uploads/../keep-me.txt');
  deleteUpload('../keep-me.txt');
  assert.equal(fs.readFileSync(outside, 'utf-8'), 'important');
});
