import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'crypto';
import jwt from 'jsonwebtoken';
import { verifyFirebaseIdToken } from '../backend/firebaseAuth';

const PROJECT = 'lemo-test';
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const pem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
const certs = { 'key-1': pem };

function token(overrides: Record<string, unknown> = {}, options: jwt.SignOptions = {}, kid = 'key-1') {
  const payload = {
    sub: 'firebase-uid-123',
    email: 'Ada@Example.com',
    email_verified: true,
    name: 'Ada',
    ...overrides,
  };
  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    keyid: kid,
    audience: PROJECT,
    issuer: `https://securetoken.google.com/${PROJECT}`,
    expiresIn: '1h',
    ...options,
  });
}

const verify = (t: string) => verifyFirebaseIdToken(t, { projectId: PROJECT, certs });

test('a valid Firebase token yields the user, with the email lowercased', async () => {
  const user = await verify(token());
  assert.equal(user.uid, 'firebase-uid-123');
  assert.equal(user.email, 'ada@example.com');
  assert.equal(user.emailVerified, true);
});

test('an unverified email is reported as unverified', async () => {
  const user = await verify(token({ email_verified: false }));
  assert.equal(user.emailVerified, false);
});

test('a token signed with a key we do not trust is refused', async () => {
  await assert.rejects(verify(token({}, {}, 'unknown-key')));
});

test('a token for another project is refused', async () => {
  await assert.rejects(verify(token({}, { audience: 'someone-else' })));
  await assert.rejects(verify(token({}, { issuer: 'https://securetoken.google.com/someone-else' })));
});

test('an expired token is refused', async () => {
  await assert.rejects(verify(token({}, { expiresIn: -10 })));
});

test('a token with a forged signature is refused', async () => {
  const good = token();
  const [head, body] = good.split('.');
  const forged = `${head}.${Buffer.from(JSON.stringify({ sub: 'someone-else', aud: PROJECT, iss: `https://securetoken.google.com/${PROJECT}`, exp: 9999999999 })).toString('base64url')}.${good.split('.')[2]}`;
  assert.equal(body === undefined, false);
  await assert.rejects(verify(forged));
});

test('a token with no subject is refused', async () => {
  await assert.rejects(verify(token({ sub: '' })));
});

test('a token with an unsigned algorithm is refused', async () => {
  const unsigned = jwt.sign({ sub: 'x', aud: PROJECT, iss: `https://securetoken.google.com/${PROJECT}` }, '', { algorithm: 'none' as any, keyid: 'key-1' } as any);
  await assert.rejects(verify(unsigned));
});
