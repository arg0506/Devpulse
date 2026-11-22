import jwt from 'jsonwebtoken';

/**
 * Verifies Firebase Authentication ID tokens on the server without a service-account key.
 * Google signs each token with a private key and publishes the matching certificates; we check
 * the signature against those certificates and the issuer, audience and expiry claims.
 */

export const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'lemo-04';
const CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

export interface VerifiedFirebaseUser {
  uid: string;
  email?: string;
  emailVerified: boolean;
  name?: string;
}

type CertMap = Record<string, string>;
let certCache: { certs: CertMap; expiresAt: number } | null = null;

async function fetchCerts(): Promise<CertMap> {
  if (certCache && Date.now() < certCache.expiresAt) return certCache.certs;
  const res = await fetch(CERTS_URL);
  if (!res.ok) throw new Error('Could not load Firebase signing certificates.');
  const certs = (await res.json()) as CertMap;
  // Google rotates these keys rarely; refresh at least hourly.
  certCache = { certs, expiresAt: Date.now() + 60 * 60 * 1000 };
  return certs;
}

/** Throws unless `idToken` is a valid, unexpired Firebase ID token for this project. */
export async function verifyFirebaseIdToken(
  idToken: string,
  options: { projectId?: string; certs?: CertMap } = {},
): Promise<VerifiedFirebaseUser> {
  const projectId = options.projectId ?? FIREBASE_PROJECT_ID;
  const decoded = jwt.decode(idToken, { complete: true });
  const kid = typeof decoded?.header.kid === 'string' ? decoded.header.kid : undefined;
  if (!kid) throw new Error('That sign-in could not be verified.');

  const certs = options.certs ?? (await fetchCerts());
  const cert = certs[kid];
  if (!cert) throw new Error('That sign-in could not be verified.');

  const payload = jwt.verify(idToken, cert, {
    algorithms: ['RS256'],
    audience: projectId,
    issuer: `https://securetoken.google.com/${projectId}`,
  }) as jwt.JwtPayload;

  if (typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 128) {
    throw new Error('That sign-in could not be verified.');
  }
  return {
    uid: payload.sub,
    email: typeof payload.email === 'string' ? payload.email.toLowerCase() : undefined,
    emailVerified: payload.email_verified === true,
    name: typeof payload.name === 'string' ? payload.name.slice(0, 80) : undefined,
  };
}
