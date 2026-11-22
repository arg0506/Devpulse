import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { db, BOT_IDS } from './db';
import { verifyToken } from './middleware/auth';
import { generateText, isGeminiReady, GEMINI_MODEL } from './gemini';
import { setIO, connectionCounts, broadcastPresence } from './realtime';
import { DevMessage, DevUser, ThreadReply, WhiteboardElement, CodeSnippet } from '../frontend/types';
import prisma, { isPrismaEnabled } from './prismaClient';
import { detectLinkCard } from './linkCards';

const MAX_MESSAGE_LENGTH = 8000;

/** Spots fenced or obviously code-shaped text so Postgres rows carry a language hint. */
export function detectCodeBlock(text: string): { isCodeBlock: boolean; language: string } {
  const fenced = text.match(/```(\w+)?\n[\s\S]*?```/);
  if (fenced) return { isCodeBlock: true, language: fenced[1] || 'plaintext' };
  if (text.split('\n').length < 3) return { isCodeBlock: false, language: 'plaintext' };
  const lower = text.toLowerCase();
  const looksLikeCode = /(const|let)\s+\w+\s*=|function\s+\w+\s*\(|import\s+.*from|def\s+\w+\(|fn\s+\w+\(|select\s+.+\s+from/i.test(text);
  if (!looksLikeCode) return { isCodeBlock: false, language: 'plaintext' };
  let language = 'javascript';
  if (lower.includes('select ') || lower.includes('insert into')) language = 'sql';
  else if (lower.includes('def ')) language = 'python';
  else if (lower.includes('fn ') || lower.includes('let mut')) language = 'rust';
  else if (lower.includes('interface ') || lower.includes(': string')) language = 'typescript';
  return { isCodeBlock: true, language };
}

// ---------- Postgres mirroring (best effort) ----------
async function ensurePrismaUser(userId: string, username: string) {
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (existing) return existing;
  return prisma.user.create({
    data: {
      id: userId,
      email: `${userId}@devpulse.local`,
      // Not a usable hash: placeholder accounts for bots cannot sign in.
      password: '!',
      username: `${username}_${userId.slice(-4)}`,
      techTags: [],
    },
  });
}

async function ensurePrismaChannel(channelId: string) {
  const existing = await prisma.channel.findUnique({ where: { id: channelId } });
  if (existing) return existing;
  let community = await prisma.community.findFirst();
  if (!community) {
    community = await prisma.community.create({
      data: { id: 'comm-global', name: 'Global Workspace', description: 'Default community', ownerId: 'system-bot' },
    });
  }
  return prisma.channel.create({ data: { id: channelId, name: channelId, communityId: community.id } });
}

function mirrorMessage(msg: DevMessage) {
  if (!isPrismaEnabled()) return;
  const { isCodeBlock, language } = detectCodeBlock(msg.text);
  (async () => {
    await ensurePrismaUser(msg.userId, msg.username);
    await ensurePrismaChannel(msg.channelId);
    await prisma.message.create({
      data: {
        id: msg.id,
        text: msg.codeSnippet ? `${msg.text}\n\n${msg.codeSnippet.code}` : msg.text,
        senderId: msg.userId,
        channelId: msg.channelId,
        isCodeBlock: isCodeBlock || !!msg.codeSnippet,
        language: msg.codeSnippet?.language || language,
        createdAt: new Date(msg.timestamp),
      },
    });
  })().catch((err) => console.warn('[sockets] Postgres mirror failed:', err.message));
}

// ---------- Helpers ----------
function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function messageFrom(user: DevUser, channelId: string, text: string, codeSnippet?: CodeSnippet): DevMessage {
  return {
    id: newId('msg'),
    channelId,
    userId: user.id,
    username: user.username,
    role: user.role,
    avatarEmoji: user.avatarEmoji,
    text,
    timestamp: new Date().toISOString(),
    repliesCount: 0,
    reactions: [],
    ...(codeSnippet ? { codeSnippet } : {}),
  };
}

function sanitiseSnippet(raw: any): CodeSnippet | undefined {
  if (!raw || typeof raw.code !== 'string' || !raw.code.trim()) return undefined;
  return {
    code: raw.code.slice(0, 20000),
    language: String(raw.language || 'plaintext').slice(0, 20),
    title: String(raw.title || 'snippet').slice(0, 80),
  };
}

const WHITEBOARD_TYPES = new Set(['pen', 'rectangle', 'circle', 'line', 'arrow', 'text']);

/** Whiteboard input is stored and rebroadcast as-is, so coerce numbers and bound sizes before it is kept. */
function sanitiseWhiteboardElement(raw: any): WhiteboardElement | null {
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.id !== 'string' || !raw.id || raw.id.length > 80) return null;
  if (!WHITEBOARD_TYPES.has(raw.type)) return null;
  const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
  return {
    id: raw.id,
    type: raw.type,
    x: num(raw.x),
    y: num(raw.y),
    width: num(raw.width),
    height: num(raw.height),
    color: String(raw.color || 'ink').slice(0, 40),
    strokeWidth: Math.min(Math.max(num(raw.strokeWidth, 2), 1), 12),
    text: raw.text ? String(raw.text).slice(0, 500) : undefined,
    points: Array.isArray(raw.points) ? raw.points.slice(0, 4000).map((n: unknown) => num(n)) : undefined,
    createdBy: '',
    username: '',
  };
}

/** Terminal colour markup: [[name]text] where name is a theme token (accent, ok, warn, err, muted). */
const c = (tone: 'accent' | 'ok' | 'warn' | 'err' | 'muted', text: string | number) => `[[${tone}]${text}]`;

export function initSockets(server: HTTPServer) {
  const io = new SocketIOServer(server, { cors: { origin: process.env.FRONTEND_URL || '*' } });
  setIO(io);

  // Every socket must present a valid session token.
  io.use((socket, next) => {
    const payload = verifyToken(socket.handshake.auth?.token);
    if (!payload) return next(new Error('unauthorized'));
    const user = db.getUser(payload.userId);
    if (!user) return next(new Error('unauthorized'));
    socket.data.userId = payload.userId;
    next();
  });

  /** Posts a message and notifies everyone who should see it. */
  function publish(msg: DevMessage) {
    db.addMessage(msg);
    io.to(`channel:${msg.channelId}`).emit('message:new', msg);
    const channel = db.getChannel(msg.channelId);
    if (channel?.category === 'Direct Messages' || channel?.category === 'Groups') {
      (channel.members || []).forEach((id) =>
        io.to(`user:${id}`).emit('channel:activity', { channelId: msg.channelId, messageId: msg.id, userId: msg.userId }),
      );
    } else {
      io.emit('channel:activity', { channelId: msg.channelId, messageId: msg.id, userId: msg.userId });
    }
  }

  async function replyAsGemini(trigger: DevMessage, author: DevUser) {
    const channelId = trigger.channelId;
    io.to(`channel:${channelId}`).emit('typing:start', { userId: 'gemini-bot', username: 'gemini', channelId });
    try {
      let text: string;
      if (!isGeminiReady()) {
        text = 'I am offline right now. Add `GEMINI_API_KEY` to the server `.env` file and restart to talk to me.';
      } else {
        const history = db
          .getMessages(channelId, 12)
          .filter((m) => m.id !== trigger.id)
          .map((m) => `@${m.username}: ${m.text}${m.codeSnippet ? `\n${m.codeSnippet.code}` : ''}`)
          .join('\n');
        text = await generateText(
          `Recent conversation in #${channelId}:\n${history || '(none)'}\n\n@${author.username} (${author.role}) asks:\n${trigger.text}${trigger.codeSnippet ? `\n\n\`\`\`${trigger.codeSnippet.language}\n${trigger.codeSnippet.code}\n\`\`\`` : ''}`,
          {
            systemInstruction:
              'You are Gemini, an expert software engineer inside DevPulse, a developer chat app. Answer concisely in Markdown. Use fenced code blocks with a language tag for code. Do not repeat the question.',
          },
        );
      }
      const bot = db.getUser('gemini-bot')!;
      publish({ ...messageFrom(bot, channelId, text || 'I had nothing to add there.'), isBot: true });
    } catch (err: any) {
      console.error('[gemini] reply failed:', err);
      const bot = db.getUser('gemini-bot')!;
      publish({ ...messageFrom(bot, channelId, `I hit an error talking to the model: ${err.message || err}`), isBot: true });
    } finally {
      io.to(`channel:${channelId}`).emit('typing:stop', { userId: 'gemini-bot', channelId });
    }
  }

  io.on('connection', (socket: Socket) => {
    const userId: string = socket.data.userId;
    const me = () => db.getUser(userId)!;
    let currentChannel: string | null = null;

    connectionCounts.set(userId, (connectionCounts.get(userId) || 0) + 1);
    if (me().status === 'offline') db.updateUserStatus(userId, 'online');
    socket.join(`user:${userId}`);

    socket.emit('init:channels', db.getChannelsForUser(userId));
    socket.emit('init:whiteboard', db.getWhiteboardElements());
    broadcastPresence();

    // ---------- Channels ----------
    socket.on('user:join-channel', ({ channelId }: { channelId: string }) => {
      if (!channelId || !db.canAccessChannel(channelId, userId)) return;
      if (currentChannel) {
        socket.leave(`channel:${currentChannel}`);
        socket.to(`channel:${currentChannel}`).emit('typing:stop', { userId, channelId: currentChannel });
      }
      currentChannel = channelId;
      socket.join(`channel:${channelId}`);
      socket.emit('init:messages', { channelId, messages: db.getMessages(channelId) });
    });

    socket.on('channel:create', (input: { name: string; description?: string; category?: 'Channels' | 'Guilds' }, ack?: (c: any) => void) => {
      const name = String(input?.name || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 32);
      if (name.length < 2) return ack?.({ error: 'Channel names need at least 2 letters or numbers.' });
      const created = db.createChannel({
        name,
        description: String(input?.description || '').slice(0, 140),
        category: input?.category === 'Guilds' ? 'Guilds' : 'Channels',
      });
      io.emit('channel:new', created);
      ack?.({ channel: created });
    });

    socket.on('dm:open', ({ userId: otherId }: { userId: string }, ack?: (c: any) => void) => {
      if (!otherId || otherId === userId || !db.getUser(otherId)) return ack?.({ error: 'That person is not on DevPulse.' });
      const channel = db.openDirectMessage(userId, otherId);
      io.to(`user:${userId}`).to(`user:${otherId}`).emit('channel:new', channel);
      ack?.({ channel });
    });

    socket.on('event:open-channel', ({ eventId }: { eventId: string }, ack?: (c: any) => void) => {
      const evt = db.getEvent(eventId);
      if (!evt) return ack?.({ error: 'That event no longer exists.' });
      const channel = db.createChannel({ id: `event-${evt.id}`, name: evt.title, description: `Discussion for ${evt.title}`, category: 'Events' });
      socket.emit('channel:new', channel);
      ack?.({ channel });
    });

    // ---------- Typing ----------
    socket.on('typing:start', ({ channelId }: { channelId: string }) => {
      socket.to(`channel:${channelId}`).emit('typing:start', { userId, username: me().username, channelId });
    });
    socket.on('typing:stop', ({ channelId }: { channelId: string }) => {
      socket.to(`channel:${channelId}`).emit('typing:stop', { userId, channelId });
    });

    // ---------- Messages ----------
    socket.on('message:send', (input: { channelId: string; text: string; codeSnippet?: CodeSnippet }) => {
      const channelId = String(input?.channelId || '');
      const text = String(input?.text || '')
        .trim()
        .slice(0, MAX_MESSAGE_LENGTH);
      const snippet = sanitiseSnippet(input?.codeSnippet);
      if (!channelId || (!text && !snippet) || !db.canAccessChannel(channelId, userId)) return;
      if (!db.getChannel(channelId)) return;

      const author = me();
      const msg = messageFrom(author, channelId, text, snippet);
      const linkCard = detectLinkCard(text);
      if (linkCard) msg.linkCard = linkCard;
      publish(msg);
      mirrorMessage(msg);
      db.incrementXp(userId, 5);
      broadcastPresence();

      const asksGemini = /(^|\s)@gemini\b/i.test(text) || channelId === 'ai-lounge';
      if (asksGemini && !channelId.startsWith('dm:')) void replyAsGemini(msg, author);
    });

    socket.on('message:delete', ({ messageId }: { messageId: string }) => {
      const msg = db.getMessage(messageId);
      if (!msg || msg.userId !== userId) return;
      db.deleteMessage(messageId);
      io.to(`channel:${msg.channelId}`).emit('message:deleted', { messageId, channelId: msg.channelId });
    });

    socket.on('message:react', ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      if (!emoji || String(emoji).length > 8) return;
      const msg = db.getMessage(messageId);
      if (!msg || !db.canAccessChannel(msg.channelId, userId)) return;
      const updated = db.toggleReaction(messageId, emoji, userId);
      if (updated) io.to(`channel:${updated.channelId}`).emit('message:update', updated);
    });

    socket.on('message:pin', ({ messageId }: { messageId: string }) => {
      const msg = db.getMessage(messageId);
      if (!msg || !db.canAccessChannel(msg.channelId, userId)) return;
      const updated = db.togglePin(messageId);
      if (updated) io.to(`channel:${updated.channelId}`).emit('message:update', updated);
    });

    // ---------- Threads ----------
    socket.on('thread:get-replies', (messageId: string) => {
      const msg = db.getMessage(messageId);
      if (!msg || !db.canAccessChannel(msg.channelId, userId)) return;
      socket.emit('thread:replies-list', { messageId, replies: db.getThreadReplies(messageId) });
    });

    socket.on('thread:send-reply', ({ messageId, text }: { messageId: string; text: string }) => {
      const parent = db.getMessage(messageId);
      const body = String(text || '')
        .trim()
        .slice(0, MAX_MESSAGE_LENGTH);
      if (!parent || !body || !db.canAccessChannel(parent.channelId, userId)) return;
      const author = me();
      const reply: ThreadReply = {
        id: newId('reply'),
        messageId,
        userId,
        username: author.username,
        role: author.role,
        avatarEmoji: author.avatarEmoji,
        text: body,
        timestamp: new Date().toISOString(),
      };
      db.addThreadReply(reply);
      io.to(`channel:${parent.channelId}`).emit('thread:reply-new', reply);
      io.to(`channel:${parent.channelId}`).emit('message:update', db.getMessage(messageId));
    });

    // ---------- Whiteboard ----------
    socket.on('whiteboard:get-state', () => {
      socket.emit('init:whiteboard', db.getWhiteboardElements());
    });

    socket.on('whiteboard:draw', (elem: WhiteboardElement) => {
      const clean = sanitiseWhiteboardElement(elem);
      if (!clean) return;
      const author = me();
      const existing = db.getWhiteboardElements().find((e) => e.id === clean.id);
      const saved = db.saveWhiteboardElement({
        ...clean,
        createdBy: existing?.createdBy || userId,
        username: existing?.username || author.username,
      });
      socket.broadcast.emit('whiteboard:drawn', saved);
    });

    socket.on('whiteboard:delete', (id: string) => {
      db.deleteWhiteboardElement(id);
      socket.broadcast.emit('whiteboard:deleted', id);
    });

    socket.on('whiteboard:clear', () => {
      db.clearWhiteboard();
      io.emit('whiteboard:cleared');
    });

    socket.on('whiteboard:cursor', ({ x, y }: { x: number; y: number }) => {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      socket.broadcast.emit('whiteboard:cursor', { userId, username: me().username, x, y });
    });

    // ---------- Console ----------
    socket.on('terminal:command', async ({ command }: { command: string }) => {
      const raw = String(command || '').trim();
      const [base = '', ...rest] = raw.split(/\s+/);
      const arg = rest.join(' ');
      const respond = (output: string, isError = false) => socket.emit('terminal:response', { output, isError });

      switch (base.toLowerCase()) {
        case 'help':
          respond(
            [
              'Commands',
              `  ${c('accent', 'whoami')}          your profile, XP and streak`,
              `  ${c('accent', 'users')}           who is online right now`,
              `  ${c('accent', 'channels')}        every channel you can open`,
              `  ${c('accent', 'events')}          upcoming events and RSVP counts`,
              `  ${c('accent', 'stats')}           workspace and storage telemetry`,
              `  ${c('accent', 'ai')} <prompt>     ask Gemini from the console`,
              `  ${c('accent', 'echo')} <text>     print text`,
              `  ${c('accent', 'date')}            server time`,
              `  ${c('accent', 'clear')}           clear the console`,
            ].join('\n'),
          );
          break;
        case 'whoami': {
          const u = me();
          respond(
            `${u.avatarEmoji} ${c('accent', '@' + u.username)}  ${u.role}\n  plan ${c('ok', u.tier || 'Free')} · ${u.xpPoints} XP · ${u.streakCount}-day streak\n  skills ${u.skills.join(', ') || '—'}`,
          );
          break;
        }
        case 'users': {
          const online = db.getUsers().filter((u) => BOT_IDS.has(u.id) || (connectionCounts.get(u.id) || 0) > 0);
          respond(
            `${online.length} online\n` + online.map((u) => `  ${u.avatarEmoji} ${c('ok', '@' + u.username)}  ${c('muted', u.role)}`).join('\n'),
          );
          break;
        }
        case 'channels': {
          const list = db
            .getChannelsForUser(userId)
            .filter((ch) => ch.category === 'Channels' || ch.category === 'Guilds' || ch.category === 'Groups');
          respond(
            list
              .map((ch) => `  ${c('accent', '#' + ch.name)}  ${c('muted', `${db.getMessages(ch.id, 100000).length} msgs`)}  ${ch.description}`)
              .join('\n'),
          );
          break;
        }
        case 'events': {
          // Same window as the Events page: an event stays upcoming for two hours after it starts.
          const upcoming = db.getEvents().filter((e) => Date.parse(e.date) > Date.now() - 2 * 3600000);
          respond(
            upcoming.length
              ? upcoming
                  .map((e) => `  ${c('warn', new Date(e.date).toUTCString().slice(0, 22))}  ${e.title}  ${c('muted', `${e.rsvps.length} going`)}`)
                  .join('\n')
              : 'No upcoming events.',
          );
          break;
        }
        case 'stats':
        case 'pulse-stats': {
          const users = db.getUsers().filter((u) => !BOT_IDS.has(u.id));
          const online = users.filter((u) => (connectionCounts.get(u.id) || 0) > 0).length;
          respond(
            [
              `storage      ${c('accent', isPrismaEnabled() ? 'PostgreSQL (Prisma) + JSON' : 'JSON file')}`,
              `ai           ${isGeminiReady() ? c('ok', GEMINI_MODEL) : c('err', 'offline')}`,
              `developers   ${c('ok', online)} online / ${users.length} total`,
              `channels     ${db.getChannels().filter((ch) => ch.category !== 'Direct Messages').length}`,
              `board        ${db.getWhiteboardElements().length} shapes`,
              `uptime       ${Math.round(process.uptime() / 60)} min`,
            ].join('\n'),
          );
          break;
        }
        case 'echo':
          respond(arg);
          break;
        case 'date':
          respond(new Date().toString());
          break;
        case 'ai': {
          if (!arg) return respond('Usage: ai <prompt>   e.g. ai write an Express route that streams a file', true);
          if (!isGeminiReady()) return respond('Gemini is offline. Set GEMINI_API_KEY in .env and restart the server.', true);
          socket.emit('terminal:response', { output: c('muted', 'asking gemini…'), isPending: true });
          try {
            const out = await generateText(arg, {
              systemInstruction: 'You answer inside a monospace developer console. Be brief. Plain text, no Markdown headings.',
            });
            respond(out || '(empty response)');
          } catch (err: any) {
            respond(`Gemini error: ${err.message || err}`, true);
          }
          break;
        }
        case 'clear':
          respond('CLEAR_CONSOLE');
          break;
        case '':
          break;
        default:
          respond(`${base}: command not found. Type ${c('accent', 'help')} for the list.`, true);
      }
    });

    socket.on('disconnect', () => {
      const remaining = (connectionCounts.get(userId) || 1) - 1;
      if (remaining <= 0) {
        connectionCounts.delete(userId);
        if (currentChannel) socket.to(`channel:${currentChannel}`).emit('typing:stop', { userId, channelId: currentChannel });
      } else {
        connectionCounts.set(userId, remaining);
      }
      broadcastPresence();
    });
  });
}
