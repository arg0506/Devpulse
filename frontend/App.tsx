import React, { useCallback, useEffect, useState } from 'react';
import { DevUser } from './types';
import { api, getToken, setToken } from './lib/api';
import { socket } from './socket';
import { WorkspaceProvider } from './lib/workspace';
import LandingPage from './components/LandingPage';
import AuthScreen from './components/AuthScreen';
import Shell from './components/Shell';
import { PulseMark } from './components/ui';

type Screen = 'loading' | 'landing' | 'signin' | 'register' | 'app';

export default function App() {
  const [user, setUser] = useState<DevUser | null>(null);
  const [screen, setScreen] = useState<Screen>(() => (getToken() ? 'loading' : 'landing'));
  const [pendingPlan, setPendingPlan] = useState<'pro' | 'enterprise' | null>(null);

  // Restore an existing session.
  useEffect(() => {
    if (!getToken()) return;
    api<DevUser>('/api/auth/me')
      .then((me) => {
        setUser(me);
        setScreen('app');
      })
      .catch(() => {
        setToken(null);
        setScreen('landing');
      });
  }, []);

  const signOut = useCallback(() => {
    setToken(null);
    socket.disconnect();
    setUser(null);
    setPendingPlan(null);
    setScreen('landing');
  }, []);

  if (screen === 'loading') {
    return (
      <div className="flex h-full items-center justify-center bg-canvas">
        <PulseMark size={36} className="animate-pulse" />
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
