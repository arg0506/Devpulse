import React, { useCallback, useEffect, useState } from 'react';
import { DevUser } from './types';
import { api, ApiError, hasSession, setSessionMarker } from './lib/api';
import { socket } from './socket';
import { signOutOfFirebase } from './lib/firebase';
import { WorkspaceProvider } from './lib/workspace';
import LandingPage from './components/LandingPage';
import AuthScreen from './components/AuthScreen';
import Shell from './components/Shell';
import { LemoMark } from './components/ui';

type Screen = 'loading' | 'landing' | 'signin' | 'register' | 'app';

export default function App() {
  const [user, setUser] = useState<DevUser | null>(null);
  const [screen, setScreen] = useState<Screen>(() => (hasSession() ? 'loading' : 'landing'));
  const [pendingPlan, setPendingPlan] = useState<'pro' | 'enterprise' | null>(null);

  // Restore an existing session.
  useEffect(() => {
    if (!hasSession()) return;
    api<DevUser>('/api/auth/me')
      .then((me) => {
        setUser(me);
        setScreen('app');
      })
      .catch((err) => {
        // Only a rejected session clears the token; a network error keeps it for the next visit.
        if (err instanceof ApiError && err.status < 500) setSessionMarker(false);
        setScreen('landing');
      });
  }, []);

  const signOut = useCallback(() => {
    // Tell the server to end this session too, so a copied token stops working. Sign-out succeeds even if the call fails.
    api('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    signOutOfFirebase();
    setSessionMarker(false);
    socket.disconnect();
    setUser(null);
    setPendingPlan(null);
    setScreen('landing');
  }, []);

  if (screen === 'loading') {
    return (
      <div className="flex h-full items-center justify-center bg-canvas">
        <LemoMark size={36} className="animate-pulse" />
      </div>
    );
  }

  if (screen === 'app' && user) {
    return (
      <WorkspaceProvider user={user} setUser={setUser} signOut={signOut} initialCheckout={pendingPlan}>
        <Shell />
      </WorkspaceProvider>
    );
  }

  if (screen === 'signin' || screen === 'register') {
    return (
      <AuthScreen
        key={screen}
        initialMode={screen}
        onBack={() => setScreen('landing')}
        onAuthenticated={(u) => {
          setUser(u);
          setScreen('app');
        }}
      />
    );
  }

  return (
    <LandingPage
      onGetStarted={(plan) => {
        setPendingPlan(plan || null);
        setScreen('register');
      }}
      onSignIn={() => setScreen('signin')}
    />
  );
}
