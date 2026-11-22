import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { api, setSessionMarker } from './api';
import { DevUser } from '../types';

// Firebase web configuration. These values identify the project to Firebase and are meant to be public;
// access is controlled by Firebase Authentication rules and the authorised domains in the console.
const firebaseConfig = {
  apiKey: 'AIzaSyDnrqJ8aHMGKUvm-sambs-mexFapocEMWE',
  authDomain: 'lemo-04.firebaseapp.com',
  projectId: 'lemo-04',
  storageBucket: 'lemo-04.firebasestorage.app',
  messagingSenderId: '70290518124',
  appId: '1:70290518124:web:36981bd3ff28e1cedae849',
};

const app = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

/** Firebase error codes that mean "no Firebase account with these details", so a legacy login can be tried. */
const NO_FIREBASE_ACCOUNT = ['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password'];

export function isMissingFirebaseAccount(err: unknown): boolean {
  return NO_FIREBASE_ACCOUNT.includes((err as { code?: string })?.code ?? '');
}

const MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'That email already has an account. Sign in instead.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/weak-password': 'Passwords need at least 8 characters.',
  'auth/network-request-failed': 'Check your connection and try again.',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
  'auth/popup-closed-by-user': 'The Google sign-in window was closed before it finished.',
  'auth/popup-blocked': 'Your browser blocked the Google sign-in window. Allow pop-ups and try again.',
  'auth/account-exists-with-different-credential': 'That email is already used with another sign-in method.',
  'auth/operation-not-allowed': 'This sign-in method is not turned on in the Firebase console yet. Turn on Email/Password and Google under Authentication.',
  'auth/unauthorized-domain': 'This domain is not allowed for sign-in. Add it under Authentication, Settings, Authorized domains in the Firebase console.',
  'auth/cancelled-popup-request': 'Another sign-in window is already open. Finish it first.',
  'auth/invalid-api-key': 'The Firebase API key in the app is wrong. Check the Firebase web config.',
  'auth/app-deleted': 'The Firebase project for this app could not be found.',
};

/** A friendly message for any sign-in error, Firebase or Lemo. */
export function describeAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code;
  if (code && MESSAGES[code]) return MESSAGES[code];
  if (code?.startsWith('auth/')) return 'That sign-in did not work. Try again.';
  return err instanceof Error ? err.message : 'Something went wrong. Try again.';
}

/** Trades a verified Firebase ID token for a Lemo session. The server sets the session cookie. */
export async function startLemoSession(idToken: string, profile?: Record<string, unknown>): Promise<DevUser> {
  const res = await api<{ user: DevUser }>('/api/auth/firebase', { body: { idToken, ...profile } });
  setSessionMarker(true);
  return res.user;
}

export async function signInWithGoogle(): Promise<DevUser> {
  const result = await signInWithPopup(firebaseAuth, googleProvider);
  return startLemoSession(await result.user.getIdToken());
}

export async function signInWithEmail(email: string, password: string): Promise<DevUser> {
  const result = await signInWithEmailAndPassword(firebaseAuth, email, password);
  return startLemoSession(await result.user.getIdToken());
}

/**
 * Creates a Firebase account and a Lemo profile together. If the profile cannot be created
 * (for example the username is taken), the Firebase account is removed again so the email stays free.
 */
export async function signUpWithEmail(email: string, password: string, profile: Record<string, unknown>): Promise<DevUser> {
  const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
  try {
    return await startLemoSession(await credential.user.getIdToken(), profile);
  } catch (err) {
    await credential.user.delete().catch(() => undefined);
    throw err;
  }
}

/** Ends the Firebase session in this browser. The Lemo session is ended separately. */
export function signOutOfFirebase(): Promise<void> {
  return signOut(firebaseAuth).catch(() => undefined);
}
