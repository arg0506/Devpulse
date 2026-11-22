import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/** Files live outside the JSON data file, so the data file stays small. */
export const UPLOAD_DIR = process.env.LEMO_UPLOAD_DIR || path.join(process.cwd(), 'uploads');
export const MAX_UPLOAD_BYTES = 500_000;

const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'application/json': 'json',
  'application/zip': 'zip',
};
const INLINE_EXTENSIONS = new Set(['png', 'jpg', 'gif', 'webp']);

export interface StoredFile {
  name: string;
  type: string;
  url: string;
}

/**
 * Decodes a base64 data URL and writes it under a random name. Returns undefined when the
 * data is not a valid, size-limited data URL.
 */
export function saveUpload(dataUrl: string, name: string, type: string): StoredFile | undefined {
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) return undefined;
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length === 0 || bytes.length > MAX_UPLOAD_BYTES) return undefined;
  const ext = EXTENSIONS[type] ?? 'bin';
  const file = `${crypto.randomBytes(16).toString('hex')}.${ext}`;
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.writeFileSync(path.join(UPLOAD_DIR, file), bytes);
  return { name: name.slice(0, 80), type, url: `/uploads/${file}` };
}

/** Removes a stored file. Anything that is not one of our generated names is ignored. */
export function deleteUpload(url: string | undefined) {
  if (!url) return;
  const file = path.basename(url);
  if (!/^[a-f0-9]{32}\.[a-z]+$/.test(file)) return;
  fs.rmSync(path.join(UPLOAD_DIR, file), { force: true });
}

/**
 * Serves stored files. Images show inline; everything else downloads, so the browser never
 * renders an uploaded document as a page.
 */
export const uploadsMiddleware = express.static(UPLOAD_DIR, {
  index: false,
  fallthrough: false,
  setHeaders(res, filePath) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    const ext = path.extname(filePath).slice(1);
    if (!INLINE_EXTENSIONS.has(ext)) res.setHeader('Content-Disposition', 'attachment');
  },
});
