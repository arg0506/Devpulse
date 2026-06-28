import fs from 'fs';
import path from 'path';
import { DevUser, DevMessage, DevChannel, ThreadReply, WhiteboardElement } from '../frontend/types';

const DATA_FILE = path.join(process.cwd(), 'backend-data.json');

export interface DevCommunity {
  id: string;
  name: string;
  description: string;
  channels: string[];
  members: string[];
}

export interface DevEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  meetLink: string;
  creator: string;
  communityId: string;
  rsvps: string[];
}

interface DatabaseSchema {
  users: Record<string, DevUser>;
  channels: DevChannel[];
  messages: DevMessage[];
  threadReplies: ThreadReply[];
  whiteboard: WhiteboardElement[];
  communities: DevCommunity[];
  events: DevEvent[];
}

const DEFAULT_COMMUNITIES: DevCommunity[] = [
  {
    id: 'comm-global',
    name: 'Global Workspace',
    description: 'The general workspace for all global announcements, news, and system integrations.',
    channels: ['general', 'bugs-and-fixes', 'showcase'],
    members: ['system-bot']
  },
  {
    id: 'comm-frontend',
    name: 'Frontend Wizards',
    description: 'CSS gurus, React and Vue speedsters, layout architects, and UI/UX designers.',
    channels: ['react-vite', 'showcase'],
    members: []
  },
  {
    id: 'comm-backend',
    name: 'Backend Engineering',
    description: 'Systems architecture, high-availability setups, database clustering, and APIs.',
    channels: ['node-api', 'system-design'],
    members: []
  }
];

const DEFAULT_EVENTS: DevEvent[] = [
  {
    id: 'evt-1',
    title: 'Prisma Schema Design Deep Dive',
    description: 'Learn best practices for relational layouts, custom migration procedures, performance tuning, and scaling multi-tenant setups.',
    date: 'Today, 2:00 PM (Local Time)',
    meetLink: 'https://meet.google.com/abc-defg-hij',
    creator: 'DanAbramovFan',
    communityId: 'comm-global',
    rsvps: ['react-guru', 'system-bot']
  },
  {
    id: 'evt-2',
    title: 'Gemini Agent Hackathon Launch',
    description: 'Building autonomous software engineering agents with the new Google GenAI SDK. 48 hours to code your dream team agent.',
    date: 'Tomorrow, 9:00 AM (Local Time)',
    meetLink: 'https://meet.google.com/xyz-qprs-tuv',
    creator: 'Gemini AI Buddy',
    communityId: 'comm-global',
    rsvps: ['gemini-bot']
  },
  {
    id: 'evt-3',
    title: 'Tailwind CSS v4 & React 19 Workshop',
    description: 'Migrating legacy apps, using the new native compiler, optimizing CSS bundles, and setting up clean utility class mappings.',
    date: 'Next Friday, 11:00 AM (Local Time)',
    meetLink: 'https://meet.google.com/foo-bar-baz',
    creator: 'TailwindMaster',
    communityId: 'comm-frontend',
    rsvps: []
  }
];

const DEFAULT_CHANNELS: DevChannel[] = [
  { id: 'general', name: 'general-discussion', description: 'Platform-wide general chat and community chatter', category: 'Channels' },
  { id: 'python-devs', name: 'python-devs', description: 'Pythonic scripts, micro-optimization, AST traversal, and compilers', category: 'Channels' },
  { id: 'react-vite', name: 'react-vite', description: 'React, Vite, frontend frameworks and Tailwind CSS talk', category: 'Channels' },
  { id: 'node-api', name: 'node-api', description: 'Backend engineering, Node.js, Express, databases, APIs', category: 'Channels' },
  { id: 'system-design', name: 'system-design', description: 'Software architecture, scaling systems, microservices, cloud', category: 'Channels' },
  { id: 'aynen-claat', name: 'aynen-claat', description: 'Collaborative namespace node', category: 'Channels' },
  { id: 'bugs-and-fixes', name: 'bugs-and-fixes', description: 'Post your bugs, stacktraces and solve them together', category: 'Channels' },
  { id: 'showcase', name: 'showcase-your-work', description: 'Show off your builds, side projects, and get feedback', category: 'Guilds' },
  { id: 'ai-lounge', name: 'ai-lounge', description: 'Discuss LLMs, generative AI, agent architectures, Gemini API', category: 'Guilds' },
];

const INITIAL_MESSAGES: DevMessage[] = [
  {
    id: 'seed-1',
    channelId: 'general',
    userId: 'system-bot',
    username: 'DevPulse Bot',
    role: 'System',
    avatarEmoji: '🤖',
    text: 'Welcome to **DevPulse**! A full-stack, real-time workspace for developers. Connect, coordinate, draw architectural flowcharts on the whiteboard, share code snippets, and play around in the live sandbox terminal below!',
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    repliesCount: 0,
    reactions: [
      { emoji: '🚀', userIds: ['system-bot'] },
      { emoji: '🔥', userIds: ['system-bot'] }
    ]
  },
  {
    id: 'seed-2',
    channelId: 'react-vite',
    userId: 'react-guru',
    username: 'DanAbramovFan',
    role: 'Staff Architect',
    avatarEmoji: '⚛️',
    text: 'Check out this quick component to throttle WebSocket updates. Incredibly handy for real-time collaboration!',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    codeSnippet: {
      title: 'useDebouncedSocket.ts',
      language: 'typescript',
      code: `import { useRef, useEffect } from 'react';\n\nexport function useThrottle(callback: (...args: any[]) => void, delay: number) {\n  const lastRun = useRef<number>(Date.now());\n\n  return (...args: any[]) => {\n    if (Date.now() - lastRun.current >= delay) {\n      callback(...args);\n      lastRun.current = Date.now();\n    }\n  };\n}`
    },
    repliesCount: 0,
    reactions: [{ emoji: '❤️', userIds: ['user-1'] }]
  }
];

class Database {
  private data: DatabaseSchema = {
    users: {},
    channels: DEFAULT_CHANNELS,
    messages: INITIAL_MESSAGES,
    threadReplies: [],
    whiteboard: [],
    communities: DEFAULT_COMMUNITIES,
    events: DEFAULT_EVENTS
  };

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const fileContent = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(fileContent);
        
        // Ensure channels match at least default ones
        if (!parsed.channels || parsed.channels.length === 0) {
          parsed.channels = DEFAULT_CHANNELS;
        }
        if (!parsed.messages) {
          parsed.messages = INITIAL_MESSAGES;
        }
        if (!parsed.users) {
          parsed.users = {};
        }
        if (!parsed.threadReplies) {
          parsed.threadReplies = [];
        }
        if (!parsed.whiteboard) {
          parsed.whiteboard = [];
        }
        if (!parsed.communities || parsed.communities.length === 0) {
          parsed.communities = DEFAULT_COMMUNITIES;
        }
        if (!parsed.events || parsed.events.length === 0) {
          parsed.events = DEFAULT_EVENTS;
        }
        
        this.data = parsed;
        console.log('Database loaded successfully from', DATA_FILE);
      } else {
        this.save();
      }

      // Guarantee default preset users exist
      const PRESET_USERS: Record<string, DevUser> = {
        'alex-g': {
          id: 'alex-g',
          username: 'alex_g',
          role: 'Lead Python Architect',
          avatarEmoji: '🐍',
          skills: ['Python', 'Docker', 'Django'],
          status: 'online',
          streakCount: 8,
          xpPoints: 180
        },
        'react-guru': {
          id: 'react-guru',
          username: 'dan_abramov',
          role: 'Senior React Architect',
          avatarEmoji: '⚛️',
          skills: ['TS', 'React', 'Tailwind'],
          status: 'online',
          streakCount: 12,
          xpPoints: 240
        },
        'tailwind-master': {
          id: 'tailwind-master',
          username: 'tailwind_guru',
          role: 'UI/UX Design Engineer',
          avatarEmoji: '🎨',
          skills: ['CSS', 'Tailwind', 'HTML5'],
          status: 'away',
          streakCount: 4,
          xpPoints: 155
        },
        'system-bot': {
          id: 'system-bot',
          username: 'system_bot',
          role: 'DevPulse Orchestrator',
          avatarEmoji: '🤖',
          skills: ['Kubernetes', 'Go', 'gRPC'],
          status: 'online',
          streakCount: 99,
          xpPoints: 500
        }
      };

      let changed = false;
      for (const [id, user] of Object.entries(PRESET_USERS)) {
        if (!this.data.users[id]) {
          this.data.users[id] = user;
          changed = true;
        }
      }
      if (changed) {
        this.save();
      }
    } catch (err) {
      console.error('Error loading database, initializing empty', err);
      this.save();
    }
  }

  private save() {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving database file', err);
    }
  }

  // User methods
  getUser(id: string): DevUser | undefined {
    return this.data.users[id];
  }

  saveUser(user: DevUser): DevUser {
    this.data.users[user.id] = user;
    this.save();
    return user;
  }

  updateUserStatus(id: string, status: 'online' | 'away' | 'dnd' | 'offline', customStatus?: string): DevUser | undefined {
    const user = this.data.users[id];
    if (user) {
      user.status = status;
      if (customStatus !== undefined) {
        user.customStatus = customStatus;
      }
      this.save();
    }
    return user;
  }

  incrementXp(id: string, amount: number): DevUser | undefined {
    const user = this.data.users[id];
    if (user) {
      user.xpPoints += amount;
      // Increment streak sometimes
      if (Math.random() > 0.8) {
        user.streakCount += 1;
      }
      this.save();
    }
    return user;
  }

  getUsers(): DevUser[] {
    return Object.values(this.data.users);
  }

  // Channels
  getChannels(): DevChannel[] {
    return this.data.channels;
  }

  createChannel(channel: Omit<DevChannel, 'id'>): DevChannel {
    const id = channel.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    // Check if channel already exists
    const existing = this.data.channels.find(c => c.id === id);
    if (existing) {
      return existing;
    }

    const newChannel: DevChannel = {
      ...channel,
      id
    };
    this.data.channels.push(newChannel);
    this.save();
    return newChannel;
  }

  // Messages
  getMessages(channelId: string): DevMessage[] {
    return this.data.messages.filter(m => m.channelId === channelId);
  }

  getMessage(id: string): DevMessage | undefined {
    return this.data.messages.find(m => m.id === id);
  }

  addMessage(message: DevMessage): DevMessage {
    // Prevent duplicate insertions
    if (this.data.messages.some(m => m.id === message.id)) {
      return message;
    }
    this.data.messages.push(message);
    this.save();
    return message;
  }

  addReaction(messageId: string, emoji: string, userId: string): DevMessage | undefined {
    const msg = this.data.messages.find(m => m.id === messageId);
    if (msg) {
      if (!msg.reactions) {
        msg.reactions = [];
      }
      const reaction = msg.reactions.find(r => r.emoji === emoji);
      if (reaction) {
        if (!reaction.userIds.includes(userId)) {
          reaction.userIds.push(userId);
        }
      } else {
        msg.reactions.push({ emoji, userIds: [userId] });
      }
      this.save();
    }
    return msg;
  }

  removeReaction(messageId: string, emoji: string, userId: string): DevMessage | undefined {
    const msg = this.data.messages.find(m => m.id === messageId);
    if (msg && msg.reactions) {
      const reaction = msg.reactions.find(r => r.emoji === emoji);
      if (reaction) {
        reaction.userIds = reaction.userIds.filter(id => id !== userId);
        if (reaction.userIds.length === 0) {
          msg.reactions = msg.reactions.filter(r => r.emoji !== emoji);
        }
      }
      this.save();
    }
    return msg;
  }

  // Thread Replies
  getThreadReplies(messageId: string): ThreadReply[] {
    return this.data.threadReplies.filter(r => r.messageId === messageId);
  }

  addThreadReply(reply: ThreadReply): ThreadReply {
    this.data.threadReplies.push(reply);
    
    // Increment repliesCount on message
    const msg = this.data.messages.find(m => m.id === reply.messageId);
    if (msg) {
      msg.repliesCount = (msg.repliesCount || 0) + 1;
    }
    
    this.save();
    return reply;
  }

  // Whiteboard Elements
  getWhiteboardElements(): WhiteboardElement[] {
    return this.data.whiteboard;
  }

  saveWhiteboardElement(elem: WhiteboardElement): WhiteboardElement {
    const index = this.data.whiteboard.findIndex(e => e.id === elem.id);
    if (index !== -1) {
      this.data.whiteboard[index] = elem;
    } else {
      this.data.whiteboard.push(elem);
    }
    this.save();
    return elem;
  }

  deleteWhiteboardElement(id: string) {
    this.data.whiteboard = this.data.whiteboard.filter(e => e.id !== id);
    this.save();
  }

  clearWhiteboard() {
    this.data.whiteboard = [];
    this.save();
  }

  // Communities helper methods
  getCommunities(): DevCommunity[] {
    return this.data.communities || [];
  }

  createCommunity(name: string, description: string, creatorId: string): DevCommunity {
    const id = 'comm-' + name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    // Fallback if already exists
    const existing = this.data.communities.find(c => c.id === id);
    if (existing) {
      return existing;
    }

    // Automatically create a channel for this community
    const chanName = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-general`;
    const newChan: DevChannel = {
      id: chanName,
      name: chanName,
      description: `Welcome to the general space of ${name}!`,
      category: 'Channels'
    };
    this.data.channels.push(newChan);

    const newComm: DevCommunity = {
      id,
      name,
      description,
      channels: [chanName],
      members: [creatorId]
    };

    this.data.communities.push(newComm);
    this.save();
    return newComm;
  }

  joinCommunity(communityId: string, userId: string): DevCommunity | undefined {
    const comm = this.data.communities.find(c => c.id === communityId);
    if (comm) {
      if (!comm.members) {
        comm.members = [];
      }
      if (!comm.members.includes(userId)) {
        comm.members.push(userId);
        this.save();
      }
    }
    return comm;
  }

  // Events helper methods
  getEvents(): DevEvent[] {
    return this.data.events || [];
  }

  createEvent(title: string, description: string, date: string, meetLink: string, creator: string, communityId: string): DevEvent {
    const id = 'evt-' + Math.random().toString(36).substring(2, 9);
    const newEvt: DevEvent = {
      id,
      title,
      description,
      date,
      meetLink,
      creator,
      communityId: communityId || 'comm-global',
      rsvps: [creator]
    };

    this.data.events.push(newEvt);
    this.save();
    return newEvt;
  }

  toggleRSVP(eventId: string, username: string): DevEvent | undefined {
    const evt = this.data.events.find(e => e.id === eventId);
    if (evt) {
      if (!evt.rsvps) {
        evt.rsvps = [];
      }
      if (evt.rsvps.includes(username)) {
        evt.rsvps = evt.rsvps.filter(u => u !== username);
      } else {
        evt.rsvps.push(username);
      }
      this.save();
    }
    return evt;
  }
}

export const db = new Database();
