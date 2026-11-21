import fs from 'fs';
import path from 'path';
import {
  DevUser,
  DevMessage,
  DevChannel,
  ThreadReply,
  WhiteboardElement,
  DevCommunity,
  DevEvent,
  AgentWorkflow,
  PresenceStatus,
} from '../frontend/types';

export type { DevCommunity, DevEvent };

const DATA_FILE = process.env.DEVPULSE_DATA_FILE || path.join(process.cwd(), 'backend-data.json');

interface Credential {
  email: string;
  passwordHash: string;
}

interface DatabaseSchema {
  users: Record<string, DevUser>;
  /** Login credentials, kept apart from public profiles so they never leak through user lists. */
  credentials: Record<string, Credential>;
  channels: DevChannel[];
  messages: DevMessage[];
  threadReplies: ThreadReply[];
  whiteboard: WhiteboardElement[];
  communities: DevCommunity[];
  events: DevEvent[];
  workflows: AgentWorkflow[];
}

/** Returns an ISO date `days` from now at the given local hour. */
function daysFromNow(days: number, hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

const DEFAULT_COMMUNITIES: DevCommunity[] = [
  {
    id: 'comm-global',
    name: 'Global Workspace',
    description: 'Announcements, platform news and everything that concerns everyone.',
    channels: ['general', 'bugs-and-fixes', 'showcase'],
    members: ['system-bot'],
  },
  {
    id: 'comm-frontend',
    name: 'Frontend',
    description: 'React, Vue, CSS, design systems and the craft of interfaces.',
    channels: ['react-vite', 'showcase'],
    members: ['react-guru', 'tailwind-master'],
  },
  {
    id: 'comm-backend',
    name: 'Backend',
    description: 'APIs, databases, queues, scaling and system design.',
    channels: ['node-api', 'system-design'],
    members: ['alex-g'],
  },
];

const DEFAULT_EVENTS: DevEvent[] = [
  {
    id: 'evt-1',
    title: 'Prisma schema design deep dive',
    description: 'Relational layouts, migrations, performance tuning and multi-tenant setups.',
    date: daysFromNow(1, 14),
    meetLink: 'https://meet.google.com/abc-defg-hij',
    creator: 'dan_abramov',
    communityId: 'comm-backend',
    rsvps: ['dan_abramov', 'alex_g'],
  },
  {
    id: 'evt-2',
    title: 'Gemini agent hackathon kickoff',
    description: 'Build autonomous engineering agents with the Google GenAI SDK. 48 hours, teams of up to four.',
    date: daysFromNow(3, 9),
    meetLink: 'https://meet.google.com/xyz-qprs-tuv',
    creator: 'system_bot',
    communityId: 'comm-global',
    rsvps: ['system_bot'],
  },
  {
    id: 'evt-3',
    title: 'Tailwind v4 and React 19 workshop',
    description: 'Migrating legacy apps, the new compiler, smaller CSS bundles and clean utility mappings.',
    date: daysFromNow(8, 11),
    meetLink: 'https://meet.google.com/foo-bar-baz',
    creator: 'tailwind_guru',
    communityId: 'comm-frontend',
    rsvps: [],
  },
];

const DEFAULT_CHANNELS: DevChannel[] = [
  { id: 'general', name: 'general', description: 'Platform-wide conversation', category: 'Channels' },
  { id: 'react-vite', name: 'react-vite', description: 'React, Vite, frontend frameworks and Tailwind', category: 'Channels' },
  { id: 'node-api', name: 'node-api', description: 'Node.js, Express, databases and APIs', category: 'Channels' },
  { id: 'python-devs', name: 'python-devs', description: 'Python, tooling, performance and compilers', category: 'Channels' },
  { id: 'system-design', name: 'system-design', description: 'Architecture, scaling, microservices and cloud', category: 'Channels' },
  { id: 'bugs-and-fixes', name: 'bugs-and-fixes', description: 'Post a stack trace, fix it together', category: 'Channels' },
  { id: 'showcase', name: 'showcase', description: 'Show your builds and get feedback', category: 'Guilds' },
  { id: 'ai-lounge', name: 'ai-lounge', description: 'LLMs and agents. Gemini answers every message here.', category: 'Guilds' },
];

const INITIAL_MESSAGES: DevMessage[] = [
  {
    id: 'seed-1',
    channelId: 'general',
    userId: 'system-bot',
    username: 'system_bot',
    role: 'DevPulse',
    avatarEmoji: '🤖',
    isBot: true,
    text: 'Welcome to **DevPulse**. Chat in channels, sketch architecture on the whiteboard, wire up agents in the studio and open the console with Ctrl + backtick. Mention @gemini in any channel to ask the AI.',
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    repliesCount: 0,
    reactions: [{ emoji: '🚀', userIds: ['system-bot'] }],
  },
  {
    id: 'seed-2',
    channelId: 'react-vite',
    userId: 'react-guru',
    username: 'dan_abramov',
    role: 'Senior React Architect',
    avatarEmoji: '⚛️',
    text: 'A tiny hook to throttle WebSocket updates. Handy for anything real-time.',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    codeSnippet: {
      title: 'useThrottle.ts',
      language: 'typescript',
      code: `import { useRef } from 'react';\n\nexport function useThrottle<T extends unknown[]>(fn: (...args: T) => void, delay: number) {\n  const last = useRef(0);\n  return (...args: T) => {\n    const now = Date.now();\n    if (now - last.current >= delay) {\n      last.current = now;\n      fn(...args);\n    }\n  };\n}`,
    },
    repliesCount: 0,
    reactions: [{ emoji: '❤️', userIds: ['alex-g'] }],
  },
];

const PRESET_USERS: Record<string, DevUser> = {
  'alex-g': {
    id: 'alex-g',
    username: 'alex_g',
    role: 'Lead Python Architect',
    avatarEmoji: '🐍',
    skills: ['Python', 'Docker', 'Django'],
    status: 'offline',
    streakCount: 8,
    xpPoints: 180,
  },
  'react-guru': {
    id: 'react-guru',
    username: 'dan_abramov',
    role: 'Senior React Architect',
    avatarEmoji: '⚛️',
    skills: ['TS', 'React', 'Tailwind'],
    status: 'offline',
    streakCount: 12,
    xpPoints: 240,
  },
  'tailwind-master': {
    id: 'tailwind-master',
    username: 'tailwind_guru',
    role: 'UI/UX Design Engineer',
    avatarEmoji: '🎨',
    skills: ['CSS', 'Tailwind', 'HTML'],
    status: 'offline',
    streakCount: 4,
    xpPoints: 155,
  },
  'system-bot': {
    id: 'system-bot',
    username: 'system_bot',
    role: 'DevPulse',
    avatarEmoji: '🤖',
    skills: ['Automation'],
    status: 'online',
    streakCount: 0,
    xpPoints: 0,
  },
  'gemini-bot': {
    id: 'gemini-bot',
    username: 'gemini',
    role: 'AI pair partner',
    avatarEmoji: '✨',
    skills: ['LLM'],
    status: 'online',
    streakCount: 0,
    xpPoints: 0,
  },
};

export const BOT_IDS = new Set(['system-bot', 'gemini-bot']);

export function dmChannelId(a: string, b: string): string {
  return 'dm:' + [a, b].sort().join(':');
}

class Database {
  private data: DatabaseSchema = {
    users: {},
    credentials: {},
    channels: [...DEFAULT_CHANNELS],
    messages: [...INITIAL_MESSAGES],
    threadReplies: [],
    whiteboard: [],
    communities: [...DEFAULT_COMMUNITIES],
    events: [...DEFAULT_EVENTS],
    workflows: [],
  };
  private saveTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        this.data = {
          users: parsed.users || {},
          credentials: parsed.credentials || {},
          channels: parsed.channels?.length ? parsed.channels : [...DEFAULT_CHANNELS],
          messages: parsed.messages || [...INITIAL_MESSAGES],
          threadReplies: parsed.threadReplies || [],
          whiteboard: parsed.whiteboard || [],
          communities: parsed.communities?.length ? parsed.communities : [...DEFAULT_COMMUNITIES],
          events: parsed.events?.length ? parsed.events : [...DEFAULT_EVENTS],
          workflows: parsed.workflows || [],
        };
        this.migrate();
        console.log('[db] Loaded', DATA_FILE);
      }
      for (const [id, user] of Object.entries(PRESET_USERS)) {
        if (!this.data.users[id]) this.data.users[id] = user;
      }
      this.saveNow();
    } catch (err) {
      console.error('[db] Could not load data file, starting fresh', err);
      this.saveNow();
    }
  }

  /** Upgrades data written by older versions of DevPulse. */
  private migrate() {
    for (const user of Object.values(this.data.users) as any[]) {
      // Older versions stored the email and password hash on the public profile.
      if (user.password && user.email && !this.data.credentials[user.id]) {
        this.data.credentials[user.id] = { email: String(user.email).toLowerCase(), passwordHash: user.password };
      }
      delete user.password;
      delete user.email;
      if (user.tier === 'Sovereign') user.tier = 'Free';
    }
    // Older seed events used free-text dates such as "Tomorrow, 9:00 AM".
    this.data.events.forEach((evt, i) => {
      if (Number.isNaN(Date.parse(evt.date))) evt.date = daysFromNow(i + 1, 10);
    });
  }

  private saveNow() {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[db] Error saving data file', err);
    }
  }

  /** Debounced write so bursts of whiteboard strokes do not hammer the disk. */
  private save() {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.saveNow();
    }, 250);
  }

  // ---------- Users ----------
  getUser(id: string): DevUser | undefined {
    return this.data.users[id];
  }

  findUserByUsername(username: string): DevUser | undefined {
    return Object.values(this.data.users).find((u) => u.username === username);
  }

  saveUser(user: DevUser): DevUser {
    const { email, password, ...clean } = user as any;
    this.data.users[user.id] = clean;
    this.save();
    return clean;
  }

  updateUser(id: string, patch: Partial<DevUser>): DevUser | undefined {
    const user = this.data.users[id];
    if (!user) return undefined;
    const allowed: (keyof DevUser)[] = ['role', 'avatarEmoji', 'skills', 'customStatus', 'bio', 'gitHubHandle', 'status'];
    for (const key of allowed) {
      if (patch[key] !== undefined) (user as any)[key] = patch[key];
    }
    this.save();
    return user;
  }

  updateUserStatus(id: string, status: PresenceStatus): DevUser | undefined {
    const user = this.data.users[id];
    if (user) {
      user.status = status;
      this.save();
    }
    return user;
  }

  incrementXp(id: string, amount: number): DevUser | undefined {
    const user = this.data.users[id];
    if (!user) return undefined;
    user.xpPoints = (user.xpPoints || 0) + amount;
    const today = new Date().toDateString();
    const anyUser = user as any;
    if (anyUser.lastActiveDay !== today) {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      user.streakCount = anyUser.lastActiveDay === yesterday ? (user.streakCount || 0) + 1 : 1;
      anyUser.lastActiveDay = today;
    }
    this.save();
    return user;
  }

  getUsers(): DevUser[] {
    return Object.values(this.data.users);
  }

  // ---------- Credentials (JSON storage mode) ----------
  getCredentialByEmail(email: string): { userId: string; cred: Credential } | undefined {
    const lower = email.toLowerCase();
    for (const [userId, cred] of Object.entries(this.data.credentials)) {
      if (cred.email === lower) return { userId, cred };
    }
    return undefined;
  }

  getCredential(userId: string): Credential | undefined {
    return this.data.credentials[userId];
  }

  setCredential(userId: string, email: string, passwordHash: string) {
    this.data.credentials[userId] = { email: email.toLowerCase(), passwordHash };
    this.save();
  }

  // ---------- Channels ----------
  getChannels(): DevChannel[] {
    return this.data.channels;
  }

  /** Public channels plus the DMs the user participates in. */
  getChannelsForUser(userId: string): DevChannel[] {
    return this.data.channels.filter((c) => c.category !== 'Direct Messages' || (c.members || []).includes(userId));
  }

  getChannel(id: string): DevChannel | undefined {
    return this.data.channels.find((c) => c.id === id);
  }

  canAccessChannel(channelId: string, userId: string): boolean {
    if (channelId.startsWith('dm:')) {
      return channelId.split(':').slice(1).includes(userId);
    }
    return true;
  }

  createChannel(channel: Omit<DevChannel, 'id'> & { id?: string }): DevChannel {
    const id =
      channel.id ||
      channel.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    const existing = this.data.channels.find((c) => c.id === id);
    if (existing) return existing;
    const created: DevChannel = { ...channel, id };
    this.data.channels.push(created);
    this.save();
    return created;
  }

  openDirectMessage(a: string, b: string): DevChannel {
    const id = dmChannelId(a, b);
    const existing = this.getChannel(id);
    if (existing) return existing;
    return this.createChannel({ id, name: id, description: 'Direct message', category: 'Direct Messages', members: [a, b].sort(), isPrivate: true });
  }

  // ---------- Messages ----------
  getMessages(channelId: string, limit = 200): DevMessage[] {
    const all = this.data.messages.filter((m) => m.channelId === channelId);
    return all.slice(-limit);
  }

  getMessage(id: string): DevMessage | undefined {
    return this.data.messages.find((m) => m.id === id);
  }

  addMessage(message: DevMessage): DevMessage {
    if (this.data.messages.some((m) => m.id === message.id)) return message;
    this.data.messages.push(message);
    this.save();
    return message;
  }

  deleteMessage(id: string) {
    this.data.messages = this.data.messages.filter((m) => m.id !== id);
    this.data.threadReplies = this.data.threadReplies.filter((r) => r.messageId !== id);
    this.save();
  }

  toggleReaction(messageId: string, emoji: string, userId: string): DevMessage | undefined {
    const msg = this.getMessage(messageId);
    if (!msg) return undefined;
    msg.reactions = msg.reactions || [];
    const reaction = msg.reactions.find((r) => r.emoji === emoji);
    if (!reaction) {
      msg.reactions.push({ emoji, userIds: [userId] });
    } else if (reaction.userIds.includes(userId)) {
      reaction.userIds = reaction.userIds.filter((id) => id !== userId);
      if (reaction.userIds.length === 0) msg.reactions = msg.reactions.filter((r) => r.emoji !== emoji);
    } else {
      reaction.userIds.push(userId);
    }
    this.save();
    return msg;
  }

  togglePin(messageId: string): DevMessage | undefined {
    const msg = this.getMessage(messageId);
    if (!msg) return undefined;
    msg.isPinned = !msg.isPinned;
    this.save();
    return msg;
  }

  // ---------- Thread replies ----------
  getThreadReplies(messageId: string): ThreadReply[] {
    return this.data.threadReplies.filter((r) => r.messageId === messageId);
  }

  addThreadReply(reply: ThreadReply): ThreadReply {
    this.data.threadReplies.push(reply);
    const msg = this.getMessage(reply.messageId);
    if (msg) msg.repliesCount = (msg.repliesCount || 0) + 1;
    this.save();
    return reply;
  }

  // ---------- Whiteboard ----------
  getWhiteboardElements(): WhiteboardElement[] {
    return this.data.whiteboard;
  }

  saveWhiteboardElement(elem: WhiteboardElement): WhiteboardElement {
    const index = this.data.whiteboard.findIndex((e) => e.id === elem.id);
    if (index !== -1) this.data.whiteboard[index] = elem;
    else this.data.whiteboard.push(elem);
    this.save();
    return elem;
  }

  deleteWhiteboardElement(id: string) {
    this.data.whiteboard = this.data.whiteboard.filter((e) => e.id !== id);
    this.save();
  }

  clearWhiteboard() {
    this.data.whiteboard = [];
    this.save();
  }

  // ---------- Communities ----------
  getCommunities(): DevCommunity[] {
    return this.data.communities;
  }

  createCommunity(name: string, description: string, creatorId: string): DevCommunity {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const id = 'comm-' + slug;
    const existing = this.data.communities.find((c) => c.id === id);
    if (existing) return existing;
    const chan = this.createChannel({
      id: `${slug}-general`,
      name: `${slug}-general`,
      description: `General conversation for ${name}`,
      category: 'Guilds',
      communityId: id,
    });
    const created: DevCommunity = { id, name, description, channels: [chan.id], members: [creatorId] };
    this.data.communities.push(created);
    this.save();
    return created;
  }

  toggleCommunityMembership(communityId: string, userId: string): DevCommunity | undefined {
    const comm = this.data.communities.find((c) => c.id === communityId);
    if (!comm) return undefined;
    comm.members = comm.members || [];
    comm.members = comm.members.includes(userId) ? comm.members.filter((id) => id !== userId) : [...comm.members, userId];
    this.save();
    return comm;
  }

  // ---------- Events ----------
  getEvents(): DevEvent[] {
    return [...this.data.events].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  }

  getEvent(id: string): DevEvent | undefined {
    return this.data.events.find((e) => e.id === id);
  }

  createEvent(input: Omit<DevEvent, 'id' | 'rsvps'> & { id?: string }): DevEvent {
    const created: DevEvent = {
      ...input,
      id: input.id || 'evt-' + Math.random().toString(36).slice(2, 9),
      communityId: input.communityId || 'comm-global',
      rsvps: [input.creator],
    };
    this.data.events.push(created);
    this.save();
    return created;
  }

  toggleRSVP(eventId: string, username: string): DevEvent | undefined {
    const evt = this.getEvent(eventId);
    if (!evt) return undefined;
    evt.rsvps = evt.rsvps.includes(username) ? evt.rsvps.filter((u) => u !== username) : [...evt.rsvps, username];
    this.save();
    return evt;
  }

  // ---------- Agent workflows ----------
  getWorkflows(ownerId: string): AgentWorkflow[] {
    return this.data.workflows.filter((w) => w.ownerId === ownerId).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }

  getWorkflow(id: string): AgentWorkflow | undefined {
    return this.data.workflows.find((w) => w.id === id);
  }

  saveWorkflow(workflow: AgentWorkflow): AgentWorkflow {
    const index = this.data.workflows.findIndex((w) => w.id === workflow.id);
    if (index !== -1) this.data.workflows[index] = workflow;
    else this.data.workflows.push(workflow);
    this.save();
    return workflow;
  }

  deleteWorkflow(id: string) {
    this.data.workflows = this.data.workflows.filter((w) => w.id !== id);
    this.save();
  }
}

export const db = new Database();
