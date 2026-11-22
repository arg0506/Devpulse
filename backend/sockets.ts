import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { db, BOT_IDS } from './db';
import { verifyToken } from './middleware/auth';
import { generateText, isGeminiReady, GEMINI_MODEL } from './gemini';
import { setIO, connectionCounts, broadcastPresence } from './realtime';
import { DevMessage, DevUser, ThreadReply, WhiteboardElement, CodeSnippet } from '../frontend/types';
import { hasPermission } from '../frontend/lib/permissions';
import { saveUpload, deleteUpload } from './uploads';
import prisma, { isPrismaEnabled } from './prismaClient';

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
      email: `${userId}@lemo.local`,
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

/**
 * Small files of any type are accepted, except ones a browser can run as a page or script
 * (HTML and SVG). Anything else is dropped.
 */
const MAX_ATTACHMENT_CHARS = 700_000;
const BLOCKED_ATTACHMENT_TYPES = /^(text\/html|application\/xhtml|image\/svg\+xml|application\/xml|text\/xml)$/i;
function sanitiseAttachment(raw: any): { name: string; type: string; dataUrl: string } | undefined {
  if (!raw || typeof raw.dataUrl !== 'string') return undefined;
  const match = /^data:([a-z0-9.+-]+\/[a-z0-9.+-]+);base64,/i.exec(raw.dataUrl);
  if (!match || raw.dataUrl.length > MAX_ATTACHMENT_CHARS || BLOCKED_ATTACHMENT_TYPES.test(match[1])) return undefined;
  return { name: String(raw.name || 'file').slice(0, 80), type: match[1].toLowerCase(), dataUrl: raw.dataUrl };
}

/**
 * Slash commands. Each returns the text to post, or a notice shown only to the sender.
 * Commands are plain text transforms: they never run code or reach outside the server.
 */
function runSlashCommand(input: string, author: string): { text: string } | { notice: string } | null {
  if (!input.startsWith('/')) return null;
  const [name, ...rest] = input.slice(1).split(/\s+/);
  const args = rest.join(' ').trim();
  switch (name.toLowerCase()) {
    case 'roll': {
      const m = /^(\d{1,2})?d(\d{1,3})$/i.exec(args || '1d6');
      if (!m) return { notice: 'Usage: /roll 2d6' };
      const count = Math.min(Math.max(Number(m[1] || 1), 1), 20);
      const sides = Math.min(Math.max(Number(m[2]), 2), 100);
      const rolls = Array.from({ length: count }, () => 1 + Math.floor(Math.random() * sides));
      const total = rolls.reduce((a, b) => a + b, 0);
      return { text: `🎲 ${author} rolled ${count}d${sides}: ${rolls.join(' + ')} = **${total}**` };
    }
    case 'shrug':
      return { text: `${args ? args + ' ' : ''}¯\\_(ツ)_/¯` };
    case 'me':
      if (!args) return { notice: 'Usage: /me waves' };
      return { text: `_${author} ${args}_` };
    case 'poll': {
      const parts = args.split('|').map((p) => p.trim()).filter(Boolean);
      if (parts.length < 3) return { notice: 'Usage: /poll Question | Option one | Option two' };
      const [question, ...options] = parts;
      const numbered = options.slice(0, 9).map((o, i) => `${i + 1}. ${o}`);
      return { text: `📊 **${question}**\n${numbered.join('\n')}\nReact with a number to vote.` };
    }
    case 'help':
      return {
        notice: 'Commands: /roll 2d6 · /shrug · /me waves · /poll Question | A | B · /help',
      };
    default:
      return { notice: `Unknown command /${name}. Try /help.` };
  }
}

/** Usernames written as @name in the text, limited to people who exist. */
function extractMentions(text: string): string[] {
  const names = new Set<string>();
  for (const m of text.matchAll(/(^|\s)@([a-z0-9_]{3,20})\b/gi)) {
    const name = m[2].toLowerCase();
    if (db.findUserByUsername(name)) names.add(name);
  }
  return [...names];
}

function sanitiseSnippet(raw: any): CodeSnippet | undefined {
  if (!raw || typeof raw.code !== 'string' || !raw.code.trim()) return undefined;
  return {
    code: raw.code.slice(0, 20000),
    language: String(raw.language || 'plaintext').slice(0, 20),
    title: String(raw.title || 'snippet').slice(0, 80),
  };
}

/** Terminal colour markup: [[name]text] where name is a theme token (accent, ok, warn, err, muted). */
const c = (tone: 'accent' | 'ok' | 'warn' | 'err' | 'muted', text: string | number) => `[[${tone}]${text}]`;

export function initSockets(server: HTTPServer) {
  // Without FRONTEND_URL, only the app's own origin can connect. The bundled client is served from the same origin.
  const io = new SocketIOServer(server, {
    cors: process.env.FRONTEND_URL ? { origin: process.env.FRONTEND_URL, credentials: true } : undefined,
  });
  setIO(io);

  // Every socket must present a valid session token.
  io.use((socket, next) => {
    const payload = verifyToken(socket.handshake.auth?.token);
    if (!payload) return next(new Error('unauthorized'));
    const user = db.getUser(payload.userId);
    if (!user) return next(new Error('unauthorized'));
    if (db.isBannedUser(payload.userId)) return next(new Error('banned'));
    socket.data.userId = payload.userId;
    next();
  });

  /** Posts a message and notifies everyone who should see it. */
  function publish(msg: DevMessage) {
    db.addMessage(msg);
    io.to(`channel:${msg.channelId}`).emit('message:new', msg);
    const channel = db.getChannel(msg.channelId);
    if (channel?.category === 'Direct Messages') {
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
          .getRecentMessages(channelId, 12).messages
          .filter((m) => m.id !== trigger.id)
          .map((m) => `@${m.username}: ${m.text}${m.codeSnippet ? `\n${m.codeSnippet.code}` : ''}`)
          .join('\n');
        text = await generateText(
          `Recent conversation in #${channelId}:\n${history || '(none)'}\n\n@${author.username} (${author.role}) asks:\n${trigger.text}${trigger.codeSnippet ? `\n\n\`\`\`${trigger.codeSnippet.language}\n${trigger.codeSnippet.code}\n\`\`\`` : ''}`,
          {
            systemInstruction:
              'You are Gemini, an expert software engineer inside Lemo, a developer chat app. Answer concisely in Markdown. Use fenced code blocks with a language tag for code. Do not repeat the question.',
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
    socket.emit('social:data', socialPayload(userId));
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
      socket.emit('init:messages', { channelId, ...db.getRecentMessages(channelId) });
    });

    /** Older history, one page at a time, for "Load older messages". */
    socket.on('messages:older', ({ channelId, beforeId }: { channelId: string; beforeId: string }) => {
      if (!channelId || !beforeId || !db.canAccessChannel(channelId, userId)) return;
      socket.emit('messages:older', { channelId, ...db.getOlderMessages(channelId, String(beforeId)) });
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
      if (!otherId || otherId === userId || !db.getUser(otherId)) return ack?.({ error: 'That person is not on Lemo.' });
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
    socket.on(
      'message:send',
      (input: { channelId: string; text: string; codeSnippet?: CodeSnippet; replyToId?: string; attachment?: unknown }) => {
      const channelId = String(input?.channelId || '');
      const text = String(input?.text || '')
        .trim()
        .slice(0, MAX_MESSAGE_LENGTH);
      const snippet = sanitiseSnippet(input?.codeSnippet);
      const attachment = sanitiseAttachment(input?.attachment);
      if (!channelId || (!text && !snippet && !attachment) || !db.canAccessChannel(channelId, userId)) return;
      const channelRecord = db.getChannel(channelId);
      if (!channelRecord) return;
      const timedOut = db.timeoutUntil(userId);
      if (timedOut) {
        socket.emit('mod:notice', { text: `You are timed out until ${new Date(timedOut).toLocaleTimeString()}.` });
        return;
      }
      if (channelRecord.communityId && !hasPermission(db.findCommunity(channelRecord.communityId), userId, 'send_messages')) {
        socket.emit('mod:notice', { text: 'You need to join this community, and have permission to post, to speak here.' });
        return;
      }

      const author = me();
      const command = text ? runSlashCommand(text, author.username) : null;
      if (command && 'notice' in command) {
        socket.emit('mod:notice', { text: command.notice });
        return;
      }
      const finalText = command && 'text' in command ? command.text : text;
      const msg = messageFrom(author, channelId, finalText, snippet);
      const stored = attachment ? saveUpload(attachment.dataUrl, attachment.name, attachment.type) : undefined;
      if (stored) msg.attachment = stored;
      const replied = input?.replyToId ? db.getMessage(String(input.replyToId)) : undefined;
      if (replied && replied.channelId === channelId) {
        msg.replyTo = { id: replied.id, username: replied.username, text: replied.text.slice(0, 120) };
      }
      const mentions = extractMentions(text);
      if (mentions.length) msg.mentions = mentions;
      publish(msg);
      // Mentioned people get a notification on their own socket room.
      for (const name of mentions) {
        const target = db.findUserByUsername(name);
        if (target && target.id !== userId) {
          io.to(`user:${target.id}`).emit('notification:mention', { messageId: msg.id, channelId, from: author.username, text: text.slice(0, 140) });
        }
      }
      mirrorMessage(msg);
      db.incrementXp(userId, 5);
      broadcastPresence();

      const asksGemini = /(^|\s)@gemini\b/i.test(text) || channelId === 'ai-lounge';
      if (asksGemini && !channelId.startsWith('dm:')) void replyAsGemini(msg, author);
    });

    /** Everything the friends and moderation screens need, for this user. */
    function socialPayload(id: string) {
      const requests = db.getFriendRequests();
      const payload: Record<string, unknown> = {
        friends: db.friendIds(id).map((f) => db.getUser(f)).filter(Boolean),
        incoming: requests.filter((r) => r.to === id).map((r) => ({ id: r.id, from: db.getUser(r.from) })).filter((r) => r.from),
        outgoing: requests.filter((r) => r.from === id).map((r) => ({ id: r.id, to: db.getUser(r.to) })).filter((r) => r.to),
        blocked: db.blockedIds(id).map((b) => db.getUser(b)).filter(Boolean),
        isAdmin: db.isAdmin(id),
      };
      if (db.isAdmin(id)) {
        payload.members = db
          .getUsers()
          .filter((u) => !BOT_IDS.has(u.id))
          .map((u) => ({ ...u, timeoutUntil: db.timeoutUntil(u.id) || null, banReason: db.banReason(u.id) || null }));
        payload.auditLog = db.getAuditLog();
      }
      return payload;
    }

    function pushSocial(ids: string[]) {
      for (const id of new Set(ids)) io.to(`user:${id}`).emit('social:data', socialPayload(id));
    }

    function dropRequestsBetween(a: string, b: string) {
      db.setFriendRequests(db.getFriendRequests().filter((r) => !((r.from === a && r.to === b) || (r.from === b && r.to === a))));
    }

    socket.on('social:get', () => socket.emit('social:data', socialPayload(userId)));

    socket.on('friend:request', ({ username }: { username: string }, ack?: (r: any) => void) => {
      const target = db.findUserByUsername(String(username || '').trim().toLowerCase());
      if (!target || target.id === userId) return ack?.({ error: 'No one with that username.' });
      if (db.isBlockedEitherWay(userId, target.id)) return ack?.({ error: 'You cannot add this person.' });
      if (db.areFriends(userId, target.id)) return ack?.({ error: 'You are already friends.' });
      const reqs = db.getFriendRequests();
      if (reqs.some((r) => (r.from === userId && r.to === target.id) || (r.from === target.id && r.to === userId))) {
        return ack?.({ error: 'A request is already pending.' });
      }
      db.setFriendRequests([...reqs, { id: newId('fr'), from: userId, to: target.id, createdAt: new Date().toISOString() }]);
      pushSocial([userId, target.id]);
      ack?.({ ok: true });
    });

    socket.on('friend:respond', ({ requestId, accept }: { requestId: string; accept: boolean }) => {
      const request = db.getFriendRequests().find((r) => r.id === requestId && r.to === userId);
      if (!request) return;
      dropRequestsBetween(request.from, request.to);
      if (accept && !db.isBlockedEitherWay(request.from, request.to)) db.addFriendship(request.from, request.to);
      pushSocial([request.from, request.to]);
    });

    socket.on('friend:remove', ({ userId: other }: { userId: string }) => {
      db.removeFriendship(userId, other);
      dropRequestsBetween(userId, other);
      pushSocial([userId, other]);
    });

    socket.on('user:block', ({ userId: other, blocked }: { userId: string; blocked: boolean }) => {
      if (!other || other === userId || !db.getUser(other)) return;
      db.setBlock(userId, other, blocked !== false);
      if (blocked !== false) dropRequestsBetween(userId, other);
      pushSocial([userId, other]);
    });

    // ---------- Moderation (admins only) ----------

    socket.on('mod:timeout', ({ userId: target, minutes }: { userId: string; minutes: number }) => {
      const targetUser = db.getUser(target);
      if (!db.isAdmin(userId) || !targetUser || db.isAdmin(target)) return;
      const mins = Math.min(Math.max(Math.floor(Number(minutes) || 10), 1), 10080);
      db.setTimeoutFor(target, new Date(Date.now() + mins * 60000).toISOString());
      db.audit({ actor: me().username, action: 'timeout', target: targetUser.username, detail: `${mins} min` });
      io.to(`user:${target}`).emit('mod:notice', { text: `You were timed out for ${mins} minutes.` });
      pushSocial([userId, target]);
    });

    socket.on('mod:untimeout', ({ userId: target }: { userId: string }) => {
      const targetUser = db.getUser(target);
      if (!db.isAdmin(userId) || !targetUser) return;
      db.setTimeoutFor(target, null);
      db.audit({ actor: me().username, action: 'remove timeout', target: targetUser.username });
      pushSocial([userId, target]);
    });

    socket.on('mod:ban', ({ userId: target, reason }: { userId: string; reason: string }) => {
      const targetUser = db.getUser(target);
      if (!db.isAdmin(userId) || !targetUser || db.isAdmin(target)) return;
      const cleanReason = String(reason || '').trim().slice(0, 140) || 'No reason given';
      db.setBan(target, cleanReason);
      db.setTimeoutFor(target, null);
      db.audit({ actor: me().username, action: 'ban', target: targetUser.username, detail: cleanReason });
      io.to(`user:${target}`).emit('mod:notice', { text: `You were banned: ${cleanReason}` });
      io.in(`user:${target}`).disconnectSockets(true);
      pushSocial([userId]);
    });

    socket.on('mod:unban', ({ userId: target }: { userId: string }) => {
      const targetUser = db.getUser(target);
      if (!db.isAdmin(userId) || !targetUser) return;
      db.setBan(target, null);
      db.audit({ actor: me().username, action: 'unban', target: targetUser.username });
      pushSocial([userId]);
    });

    socket.on('mod:delete', ({ messageId }: { messageId: string }) => {
      const msg = db.getMessage(messageId);
      if (!msg) return;
      const messageChannel = db.getChannel(msg.channelId);
      const community = messageChannel?.communityId ? db.findCommunity(messageChannel.communityId) : undefined;
      const canModerate = db.isAdmin(userId) || hasPermission(community, userId, 'manage_messages');
      if (!canModerate) return;
      db.deleteMessage(messageId);
      deleteUpload(msg.attachment?.url);
      db.audit({ actor: me().username, action: 'delete message', target: msg.username, detail: msg.text.slice(0, 80) });
      io.to(`channel:${msg.channelId}`).emit('message:deleted', { messageId, channelId: msg.channelId });
      pushSocial([userId]);
    });

    socket.on('message:edit', ({ messageId, text }: { messageId: string; text: string }) => {
      const msg = db.getMessage(messageId);
      const nextText = String(text || '')
        .trim()
        .slice(0, MAX_MESSAGE_LENGTH);
      if (!msg || msg.userId !== userId || !nextText) return;
      const updated = db.editMessage(messageId, nextText, new Date().toISOString());
      if (updated) io.to(`channel:${updated.channelId}`).emit('message:update', updated);
    });

    socket.on('message:delete', ({ messageId }: { messageId: string }) => {
      const msg = db.getMessage(messageId);
      if (!msg || msg.userId !== userId) return;
      db.deleteMessage(messageId);
      deleteUpload(msg.attachment?.url);
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
      if (!elem?.id || !elem.type) return;
      const author = me();
      const existing = db.getWhiteboardElements().find((e) => e.id === elem.id);
      const saved = db.saveWhiteboardElement({
        ...elem,
        text: elem.text ? String(elem.text).slice(0, 500) : undefined,
        points: Array.isArray(elem.points) ? elem.points.slice(0, 4000) : undefined,
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
          const list = db.getChannelsForUser(userId).filter((ch) => ch.category === 'Channels' || ch.category === 'Guilds');
          respond(
            list
              .map((ch) => `  ${c('accent', '#' + ch.name)}  ${c('muted', `${db.getRecentMessages(ch.id, 100000).messages.length} msgs`)}  ${ch.description}`)
              .join('\n'),
          );
          break;
        }
        case 'events': {
          const upcoming = db.getEvents().filter((e) => Date.parse(e.date) > Date.now() - 3600000);
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
