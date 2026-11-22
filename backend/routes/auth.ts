import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma, { isPrismaEnabled } from '../prismaClient';
import { authMiddleware, AuthenticatedRequest, signToken, sessionCookie, clearSessionCookie } from '../middleware/auth';
import { db } from '../db';
import { DevUser } from '../../frontend/types';
import { broadcastPresence, getIO } from '../realtime';
import { verifyFirebaseIdToken } from '../firebaseAuth';
import { saveImage, deleteUpload, isOwnImageUrl } from '../uploads';

const router = Router();

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normaliseUsername(raw: string): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function buildProfile(id: string, body: any, username: string): DevUser {
  const skills = Array.isArray(body.skills) ? body.skills.slice(0, 6).map(String) : [];
  return {
    id,
    username,
    role: String(body.role || 'Developer').slice(0, 40),
    avatarEmoji: String(body.avatarEmoji || '👾').slice(0, 8),
    skills,
    bio: body.bio ? String(body.bio).slice(0, 280) : undefined,
    gitHubHandle: body.gitHubHandle ? String(body.gitHubHandle).slice(0, 39) : undefined,
    status: 'online',
    streakCount: 1,
    xpPoints: 0,
    tier: 'Free',
    createdAt: new Date().toISOString(),
  };
}

/** Make sure a workspace profile exists for an account (e.g. one created directly in Postgres). */
function ensureProfile(id: string, username: string, techTags: string[] = []): DevUser {
  return db.getUser(id) || db.saveUser(buildProfile(id, { skills: techTags }, username));
}

router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const username = normaliseUsername(req.body?.username);

    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Email, username and password are required.' });
    }
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (!USERNAME_RE.test(username)) {
      return res.status(400).json({ error: 'Usernames use 3–20 lowercase letters, numbers or underscores.' });
    }
    if (String(password).length < 8) return res.status(400).json({ error: 'Passwords need at least 8 characters.' });
    // bcrypt ignores everything past 72 bytes, so a longer password would not be what the user typed.
    if (Buffer.byteLength(String(password), 'utf8') > 72) {
      return res.status(400).json({ error: 'Passwords can be at most 72 bytes long.' });
    }

    const lowerEmail = String(email).toLowerCase();
    const passwordHash = await bcrypt.hash(String(password), 10);

    let userId: string;
    if (isPrismaEnabled()) {
      const existing = await prisma.user.findFirst({ where: { OR: [{ email: lowerEmail }, { username }] } });
      if (existing) {
        return res.status(409).json({ error: existing.email === lowerEmail ? 'That email already has an account.' : 'That username is taken.' });
      }
      const created = await prisma.user.create({
        data: {
          email: lowerEmail,
          password: passwordHash,
          username,
          bio: req.body.bio || null,
          gitHubHandle: req.body.gitHubHandle || null,
          techTags: Array.isArray(req.body.skills) ? req.body.skills : [],
        },
      });
      userId = created.id;
    } else {
      if (db.getCredentialByEmail(lowerEmail)) return res.status(409).json({ error: 'That email already has an account.' });
      if (db.findUserByUsername(username)) return res.status(409).json({ error: 'That username is taken.' });
      userId = `user-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      db.setCredential(userId, lowerEmail, passwordHash);
    }

    const profile = db.saveUser(buildProfile(userId, req.body, username));
    res.setHeader('Set-Cookie', sessionCookie(signToken({ userId, username })));
    return res.status(201).json({ user: profile });
  } catch (error: any) {
    console.error('[auth] register failed:', error);
    return res.status(500).json({ error: 'Could not create the account. Try again in a moment.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { loginCredential, password } = req.body || {};
    if (!loginCredential || !password) {
      return res.status(400).json({ error: 'Enter your email or username and your password.' });
    }
    const credential = String(loginCredential).trim().toLowerCase();
    const invalid = () => res.status(401).json({ error: 'That email, username or password is incorrect.' });

    if (isPrismaEnabled()) {
      const user = await prisma.user.findFirst({ where: { OR: [{ email: credential }, { username: credential }] } });
      if (!user || !(await bcrypt.compare(String(password), user.password))) return invalid();
      const profile = ensureProfile(user.id, user.username, user.techTags);
      res.setHeader('Set-Cookie', sessionCookie(signToken({ userId: user.id, username: user.username })));
      return res.json({ user: profile });
    }

    let userId: string | undefined;
    const byEmail = db.getCredentialByEmail(credential);
    if (byEmail) userId = byEmail.userId;
    else userId = db.findUserByUsername(credential)?.id;

    const cred = userId ? db.getCredential(userId) : undefined;
    if (!userId || !cred || !(await bcrypt.compare(String(password), cred.passwordHash))) return invalid();

    const profile = db.getUser(userId)!;
    res.setHeader('Set-Cookie', sessionCookie(signToken({ userId, username: profile.username })));
    return res.json({ user: profile });
  } catch (error: any) {
    console.error('[auth] login failed:', error);
    return res.status(500).json({ error: 'Could not sign in. Try again in a moment.' });
  }
});

/** Starts a session from a Firebase Authentication sign-in. Firebase proves who the person is; Lemo keeps the profile. */
router.post('/firebase', async (req, res) => {
  const { idToken, username: wantedName, role, avatarEmoji, skills } = req.body || {};
  if (typeof idToken !== 'string' || !idToken) return res.status(400).json({ error: 'That sign-in is missing its token.' });

  let firebaseUser;
  try {
    firebaseUser = await verifyFirebaseIdToken(idToken);
  } catch {
    return res.status(401).json({ error: 'That sign-in could not be verified. Try again.' });
  }

  const signedInAs = (userId: string, status = 200) => {
    const profile = db.getUser(userId)!;
    res.setHeader('Set-Cookie', sessionCookie(signToken({ userId, username: profile.username })));
    return res.status(status).json({ user: profile });
  };

  try {
    const linked = db.findUserIdByFirebaseUid(firebaseUser.uid);
    if (linked) return signedInAs(linked);

    if (firebaseUser.email) {
      const existing = db.getCredentialByEmail(firebaseUser.email);
      if (existing) {
        // Only a verified email may claim an account that already exists, so nobody can take over someone else's.
        if (!firebaseUser.emailVerified) {
          return res.status(409).json({ error: 'That email already has an account. Sign in with your password instead.' });
        }
        db.linkFirebaseUid(existing.userId, firebaseUser.uid);
        return signedInAs(existing.userId);
      }
    }

    const cleanWanted = typeof wantedName === 'string' ? normaliseUsername(wantedName) : '';
    if (cleanWanted && (!USERNAME_RE.test(cleanWanted) || db.findUserByUsername(cleanWanted))) {
      return res.status(409).json({ error: 'That username is unavailable. Pick another.' });
    }
    let username = cleanWanted;
    if (!username) {
      const seed = normaliseUsername(firebaseUser.name || firebaseUser.email?.split('@')[0] || 'member').replace(/[^a-z0-9_]/g, '').slice(0, 14);
      username = seed.length >= 3 ? seed : 'member';
      while (db.findUserByUsername(username)) username = `${seed.slice(0, 12)}${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const userId = `user-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    // An empty password hash means this account only signs in through Firebase.
    db.setCredential(userId, firebaseUser.email || `${firebaseUser.uid}@firebase.local`, '');
    db.linkFirebaseUid(userId, firebaseUser.uid);
    db.saveUser(buildProfile(userId, { role, avatarEmoji, skills }, username));
    return signedInAs(userId, 201);
  } catch (error: any) {
    console.error('[auth] firebase sign-in failed:', error);
    return res.status(500).json({ error: 'Could not sign in. Try again in a moment.' });
  }
});

/** Ends every session for this account, on every device, and disconnects its live sockets. */
router.post('/logout', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;
  db.revokeSessions(userId);
  getIO()?.in(`user:${userId}`).disconnectSockets(true);
  res.setHeader('Set-Cookie', clearSessionCookie());
  res.json({ ok: true });
});

router.get('/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const profile = db.getUser(req.user!.userId);
  if (!profile) return res.status(404).json({ error: 'This account no longer exists.' });
  return res.json(profile);
});

// Kept for compatibility with earlier clients.
router.get('/profile', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const profile = db.getUser(req.user!.userId);
  if (!profile) return res.status(404).json({ error: 'This account no longer exists.' });
  return res.json(profile);
});

/** Uploads a profile photo. It replaces the emoji avatar and the previous photo, if any. */
router.post('/me/avatar', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;
  const stored = saveImage(String(req.body?.dataUrl || ''), 'avatar');
  if (!stored) return res.status(400).json({ error: 'Choose a PNG, JPEG, GIF or WebP photo under 500 KB.' });
  const previous = db.getUser(userId)?.avatarEmoji;
  const updated = db.updateUser(userId, { avatarEmoji: stored.url });
  if (isOwnImageUrl(previous)) deleteUpload(previous);
  broadcastPresence();
  return res.json(updated);
});

/** Removes the profile photo and goes back to the emoji avatar. */
router.delete('/me/avatar', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;
  const previous = db.getUser(userId)?.avatarEmoji;
  const updated = db.updateUser(userId, { avatarEmoji: '👾' });
  if (isOwnImageUrl(previous)) deleteUpload(previous);
  broadcastPresence();
  return res.json(updated);
});

router.patch('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const body = req.body || {};
  const patch: Partial<DevUser> = {};
  if (typeof body.role === 'string') patch.role = body.role.slice(0, 40);
  if (typeof body.avatarEmoji === 'string') {
    patch.avatarEmoji = isOwnImageUrl(body.avatarEmoji) ? body.avatarEmoji : body.avatarEmoji.slice(0, 8);
  }
  if (Array.isArray(body.skills)) patch.skills = body.skills.slice(0, 6).map(String);
  if (typeof body.customStatus === 'string') patch.customStatus = body.customStatus.slice(0, 80);
  if (typeof body.bio === 'string') patch.bio = body.bio.slice(0, 280);
  if (typeof body.gitHubHandle === 'string') patch.gitHubHandle = body.gitHubHandle.slice(0, 39);
  if (['online', 'away', 'dnd'].includes(body.status)) patch.status = body.status;

  const updated = db.updateUser(req.user!.userId, patch);
  if (!updated) return res.status(404).json({ error: 'This account no longer exists.' });
  broadcastPresence();

  if (isPrismaEnabled()) {
    prisma.user
      .update({
        where: { id: req.user!.userId },
        data: { bio: updated.bio ?? null, gitHubHandle: updated.gitHubHandle ?? null, techTags: updated.skills },
      })
      .catch((err) => console.warn('[auth] profile sync to Postgres failed:', err.message));
  }
  return res.json(updated);
});

export default router;
