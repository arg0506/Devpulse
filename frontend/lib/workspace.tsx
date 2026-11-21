import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { socket } from '../socket';
import { ChatPresence, DevChannel, DevUser } from '../types';

export type View = 'chat' | 'communities' | 'events' | 'board' | 'agents';
export type Theme = 'light' | 'dark';

interface WorkspaceValue {
  user: DevUser;
  setUser: (u: DevUser) => void;
  signOut: () => void;

  connected: boolean;
  channels: DevChannel[];
  presences: ChatPresence[];
  presenceOf: (userId: string) => ChatPresence | undefined;

  view: View;
  setView: (v: View) => void;
  activeChannelId: string;
  openChannel: (id: string) => void;
  openDM: (userId: string) => void;
  unread: Record<string, number>;
  /** Timestamps of recent workspace activity, drawn by the status-bar pulse. */
  beats: number[];

  consoleOpen: boolean;
  toggleConsole: () => void;
  theme: Theme;
  toggleTheme: () => void;

  profileUserId: string | null;
  showProfile: (userId: string | null) => void;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  checkoutPlan: 'pro' | 'enterprise' | null;
  openCheckout: (plan: 'pro' | 'enterprise' | null) => void;
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

export function useWorkspace(): WorkspaceValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside <WorkspaceProvider>');
  return ctx;
}

function readTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function WorkspaceProvider({
  user,
  setUser,
  signOut,
  initialCheckout,
  children,
}: {
  user: DevUser;
  setUser: (u: DevUser) => void;
  signOut: () => void;
  initialCheckout: 'pro' | 'enterprise' | null;
  children: React.ReactNode;
}) {
  const [connected, setConnected] = useState(false);
  const [channels, setChannels] = useState<DevChannel[]>([]);
  const [presences, setPresences] = useState<ChatPresence[]>([]);
  const [view, setView] = useState<View>('chat');
  const [activeChannelId, setActiveChannelId] = useState(() => localStorage.getItem('devpulse_channel') || 'general');
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [beats, setBeats] = useState<number[]>([]);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(readTheme);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<'pro' | 'enterprise' | null>(initialCheckout);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const viewRef = useRef(view);
  const channelRef = useRef(activeChannelId);
  viewRef.current = view;
  channelRef.current = activeChannelId;

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onConnectError = (err: Error) => {
      setConnected(false);
      if (err.message === 'unauthorized') signOut();
    };
    const onChannels = (list: DevChannel[]) => {
      setChannels(list);
      if (!list.some((c) => c.id === channelRef.current)) setActiveChannelId('general');
    };
    const onChannelNew = (chan: DevChannel) => setChannels((prev) => (prev.some((c) => c.id === chan.id) ? prev : [...prev, chan]));
    const onActivity = ({ channelId, userId }: { channelId: string; userId?: string }) => {
      setBeats((prev) => [...prev.filter((t) => Date.now() - t < 60000), Date.now()]);
      if (userId === user.id) return;
      if (viewRef.current === 'chat' && channelRef.current === channelId) return;
      setUnread((prev) => ({ ...prev, [channelId]: (prev[channelId] || 0) + 1 }));
    };
    const onUserUpdated = (u: DevUser) => {
      if (u.id === user.id) setUser(u);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('init:channels', onChannels);
    socket.on('channel:new', onChannelNew);
    socket.on('presence:list', setPresences);
    socket.on('channel:activity', onActivity);
    socket.on('user:updated', onUserUpdated);
    socket.connect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('init:channels', onChannels);
      socket.off('channel:new', onChannelNew);
      socket.off('presence:list', setPresences);
      socket.off('channel:activity', onActivity);
      socket.off('user:updated', onUserUpdated);
      socket.disconnect();
    };
    // The connection lives for the whole signed-in session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  // Global shortcuts: Ctrl/Cmd+K palette, Ctrl+` console.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((p) => !p);
      } else if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        setConsoleOpen((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const openChannel = useCallback((id: string) => {
    setActiveChannelId(id);
    try {
      localStorage.setItem('devpulse_channel', id);
    } catch {
      /* ignore */
    }
    setUnread((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setView('chat');
  }, []);

  const openDM = useCallback(
    (otherId: string) => {
      socket.emit('dm:open', { userId: otherId }, (res: { channel?: DevChannel; error?: string }) => {
        if (res?.channel) {
          setChannels((prev) => (prev.some((c) => c.id === res.channel!.id) ? prev : [...prev, res.channel!]));
          openChannel(res.channel.id);
          setProfileUserId(null);
        }
      });
    },
    [openChannel],
  );

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem('devpulse_theme', next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const presenceOf = useCallback((id: string) => presences.find((p) => p.userId === id), [presences]);

  const value = useMemo<WorkspaceValue>(
    () => ({
      user,
      setUser,
      signOut,
      connected,
      channels,
      presences,
      presenceOf,
      view,
      setView: (v) => {
        setView(v);
        if (v === 'chat') openChannel(channelRef.current);
      },
      activeChannelId,
      openChannel,
      openDM,
      unread,
      beats,
      consoleOpen,
      toggleConsole: () => setConsoleOpen((p) => !p),
      theme,
      toggleTheme,
      profileUserId,
      showProfile: setProfileUserId,
      settingsOpen,
      setSettingsOpen,
      checkoutPlan,
      openCheckout: setCheckoutPlan,
      paletteOpen,
      setPaletteOpen,
    }),
    [
      user,
      setUser,
      signOut,
      connected,
      channels,
      presences,
      presenceOf,
      view,
      activeChannelId,
      openChannel,
      openDM,
      unread,
      beats,
      consoleOpen,
      theme,
      toggleTheme,
      profileUserId,
      settingsOpen,
      checkoutPlan,
      paletteOpen,
    ],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

/** Human label for a channel, resolving DM ids to the other person's name. */
export function channelLabel(channel: DevChannel | undefined, meId: string, presenceOf: (id: string) => ChatPresence | undefined): string {
  if (!channel) return '';
  if (channel.category === 'Direct Messages') {
    const other = (channel.members || []).find((m) => m !== meId);
    return other ? presenceOf(other)?.username || 'direct message' : 'notes to self';
  }
  return channel.name;
}
