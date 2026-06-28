import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { db } from './db';
import { GoogleGenAI } from '@google/genai';
import { DevUser, DevMessage, ThreadReply, WhiteboardElement } from '../frontend/types';
import prisma, { isPrismaEnabled } from './prismaClient';

// Safe lazy initialization of GoogleGenAI
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
  try {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log('Gemini AI initialized on backend.');
  } catch (err) {
    console.error('Failed to initialize Gemini AI SDK:', err);
  }
}

// Track connected socket users mapping socketId -> User ID
const activeSockets = new Map<string, { userId: string; channelId?: string; room?: string }>();

// Smart helper function to detect code block and identify programming language
function detectCodeBlock(text: string): { isCodeBlock: boolean; language: string } {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/;
  const match = text.match(codeBlockRegex);
  if (match) {
    return {
      isCodeBlock: true,
      language: match[1] || 'plaintext'
    };
  }

  // Common keywords matching code indicators
  const codeIndicators = [
    /const\s+\w+\s*=/i,
    /let\s+\w+\s*=/i,
    /function\s+\w+\s*\(/i,
    /import\s+.*\s+from/i,
    /class\s+\w+/i,
    /def\s+\w+\s*\(.*\):/i,
    /fn\s+\w+\s*\(.*\)/i,
    /pub\s+fn/i,
    /struct\s+\w+/i,
    /select\s+.*\s+from/i,
    /insert\s+into/i,
    /update\s+.*\s+set/i,
    /<\/?[a-z][\s\S]*>/i, // HTML
  ];

  const lines = text.split('\n');
  if (lines.length >= 3) {
    let matchesCount = 0;
    for (const indicator of codeIndicators) {
      if (indicator.test(text)) {
        matchesCount++;
      }
    }
    const semicolonCount = (text.match(/;/g) || []).length;
    const curlyBraceCount = (text.match(/\{[\s\S]*\}/g) || []).length;

    if (matchesCount >= 1 || semicolonCount >= 3 || curlyBraceCount >= 1) {
      let language = 'javascript';
      if (text.toLowerCase().includes('select ') || text.toLowerCase().includes('insert ')) language = 'sql';
      else if (text.toLowerCase().includes('def ') || text.toLowerCase().includes('import os')) language = 'python';
      else if (text.toLowerCase().includes('fn ') || text.toLowerCase().includes('let mut')) language = 'rust';
      else if (text.toLowerCase().includes('<html>') || text.toLowerCase().includes('<div>')) language = 'html';
      else if (text.toLowerCase().includes('import react') || text.toLowerCase().includes('interface ')) language = 'typescript';
      return { isCodeBlock: true, language };
    }
  }

  return { isCodeBlock: false, language: 'plaintext' };
}

// Resilient helper to guarantee user exists in PostgreSQL
async function ensureUserExists(userId: string, username: string) {
  if (!isPrismaEnabled()) return null;
  try {
    const cleanId = userId || `dev-${Date.now()}`;
    const cleanUsername = (username || 'developer').toLowerCase().replace(/\s+/g, '_');
    const email = `${cleanUsername}@devpulse.local`;

    const existing = await prisma.user.findUnique({ where: { id: cleanId } });
    if (existing) {
      return existing;
    }

    // Attempt to insert
    return await prisma.user.create({
      data: {
        id: cleanId,
        email,
        password: '$2a$10$placeholderhashedpasswordforonlineusersdontauthwiththis',
        username: cleanUsername,
        bio: 'Connected developer on DevPulse Real-Time Uplink',
        techTags: ['TypeScript', 'Node.js']
      }
    });
  } catch (error) {
    console.warn('[Prisma] User setup bypassed (Database might be unprovisioned yet):', error);
    return null;
  }
}

// Resilient helper to guarantee channel exists in PostgreSQL
async function ensureChannelExists(channelId: string) {
  if (!isPrismaEnabled()) return null;
  try {
    const existing = await prisma.channel.findUnique({ where: { id: channelId } });
    if (existing) {
      return existing;
    }

    // Guarantee default community
    let community = await prisma.community.findFirst();
    if (!community) {
      community = await prisma.community.create({
        data: {
          id: 'devpulse-community',
          name: 'DevPulse Global Workspace',
          description: 'The general workspace for real-time collaboration',
          ownerId: 'system-bot'
        }
      });
    }

    return await prisma.channel.create({
      data: {
        id: channelId,
        name: channelId,
        communityId: community.id
      }
    });
  } catch (error) {
    console.warn('[Prisma] Channel setup bypassed (Database might be unprovisioned yet):', error);
    return null;
  }
}

export function initSockets(server: HTTPServer) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log('Socket connected:', socket.id);

    // Send initial channel list immediately
    socket.emit('init:channels', db.getChannels());

    // Send whiteboard elements
    socket.emit('init:whiteboard', db.getWhiteboardElements());

    // ----------------------------------------------------
    // SPECIFIED TARGET EVENT: join_room (For DMs & Chats)
    // ----------------------------------------------------
    socket.on('join_room', async ({ roomId, userId, username }: { roomId: string; userId: string; username: string }) => {
      console.log(`[Socket] User ${username} (${userId}) requested to join room: ${roomId}`);
      
      socket.join(roomId);

      const socketState = activeSockets.get(socket.id) || { userId };
      socketState.room = roomId;
      activeSockets.set(socket.id, socketState);

      // Verify and sync schema records
      await ensureUserExists(userId, username);
      await ensureChannelExists(roomId);

      socket.to(roomId).emit('user_joined_room', { userId, username, roomId });
    });

    // ----------------------------------------------------
    // SPECIFIED TARGET EVENT: send_message (Dual PostgreSQL/InMemory + Code Detection)
    // ----------------------------------------------------
    socket.on('send_message', async (payload: { roomId: string; senderId: string; username: string; text: string }) => {
      const { roomId, senderId, username, text } = payload;
      console.log(`[Socket] Message from ${username} in room ${roomId}: "${text.substring(0, 30)}..."`);

      // Detect if text looks like a code snippet
      const { isCodeBlock, language } = detectCodeBlock(text);

      // 1. Build message metadata
      const messageId = `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const timestamp = new Date().toISOString();

      // Create fallback item for front-end
      const frontendMsg: DevMessage = {
        id: messageId,
        channelId: roomId,
        userId: senderId,
        username,
        role: 'Engineer',
        avatarEmoji: '💻',
        text,
        timestamp,
        repliesCount: 0,
        reactions: [],
        ...(isCodeBlock ? {
          codeSnippet: {
            code: text,
            language,
            title: 'console_paste'
          }
        } : {})
      };

      // 2. Persist to SQLite/JSON in-memory database as absolute fallback
      db.addMessage(frontendMsg);

      // 3. Persist to PostgreSQL via Prisma Client
      if (isPrismaEnabled()) {
        try {
          await ensureUserExists(senderId, username);
          await ensureChannelExists(roomId);

          await prisma.message.create({
            data: {
              id: messageId,
              text,
              senderId,
              channelId: roomId,
              isCodeBlock,
              language,
              createdAt: new Date(timestamp)
            }
          });
          console.log('[Prisma] Message persisted to PostgreSQL successfully.');
        } catch (err: any) {
          console.warn('[Prisma] Failed to write message to PostgreSQL:', err.message);
        }
      }

      // 4. Broadcast message to all subscribers of the room
      io.to(roomId).emit('receive_message', frontendMsg);
      io.to(roomId).emit('message:new', frontendMsg);
    });

    // Handle User Login/Init
    socket.on('user:init', async (user: DevUser) => {
      // Register or update user in database
      const savedUser = db.saveUser({
        ...user,
        status: 'online'
      });
      
      activeSockets.set(socket.id, { userId: savedUser.id });
      
      // Join general as default channel
      socket.join('channel:general');
      activeSockets.get(socket.id)!.channelId = 'general';

      // Ensure user and channel exist in PostgreSQL
      await ensureUserExists(savedUser.id, savedUser.username);
      await ensureChannelExists('general');

      // Broadcast updated user presence to all clients
      broadcastPresence(io);

      // Send current messages for general channel to this user
      socket.emit('init:messages', db.getMessages('general'));
      
      // Let other users know
      socket.to('channel:general').emit('notification:user-joined', {
        username: savedUser.username,
        avatarEmoji: savedUser.avatarEmoji
      });
    });

    // Handle profile/status updates
    socket.on('user:update-profile', (updatedUser: DevUser) => {
      db.saveUser(updatedUser);
      broadcastPresence(io);
    });

    // Handle joining a channel
    socket.on('user:join-channel', async ({ userId, channelId }: { userId: string; channelId: string }) => {
      const socketState = activeSockets.get(socket.id);
      if (socketState) {
        if (socketState.channelId) {
          socket.leave(`channel:${socketState.channelId}`);
          socket.to(`channel:${socketState.channelId}`).emit('typing:stop', { userId });
        }
        
        socketState.channelId = channelId;
        socket.join(`channel:${channelId}`);
        
        // Ensure channel exists in SQL
        await ensureChannelExists(channelId);

        // Fetch and send message history for new channel
        socket.emit('init:messages', db.getMessages(channelId));
      }
    });

    // Handle channel creation
    socket.on('channel:create', (newChan: { name: string; description: string; category: 'Channels' | 'Guilds' | 'Direct Messages' }) => {
      const created = db.createChannel(newChan);
      io.emit('channel:new', created);
    });

    // Handle typing status
    socket.on('typing:start', ({ userId, username, channelId }: { userId: string; username: string; channelId: string }) => {
      socket.to(`channel:${channelId}`).emit('typing:start', { userId, username });
    });

    socket.on('typing:stop', ({ userId, channelId }: { userId: string; channelId: string }) => {
      socket.to(`channel:${channelId}`).emit('typing:stop', { userId });
    });

    // Handle sending a message (Legacy UI route)
    socket.on('message:send', async (msgData: DevMessage) => {
      const savedMsg = db.addMessage(msgData);
      
      // Broadcast to all in the channel
      io.to(`channel:${msgData.channelId}`).emit('message:new', savedMsg);

      // Increment XP for sending message
      db.incrementXp(msgData.userId, 5);
      broadcastPresence(io);

      // Persist to PostgreSQL via Prisma
      if (isPrismaEnabled()) {
        try {
          await ensureUserExists(msgData.userId, msgData.username);
          if (msgData.channelId) {
            await ensureChannelExists(msgData.channelId);
          }

          const { isCodeBlock, language } = detectCodeBlock(msgData.text);

          await prisma.message.create({
            data: {
              id: msgData.id,
              text: msgData.text,
              senderId: msgData.userId,
              channelId: msgData.channelId,
              isCodeBlock: isCodeBlock || !!msgData.codeSnippet,
              language: language || msgData.codeSnippet?.language || 'plaintext',
              createdAt: new Date(msgData.timestamp)
            }
          });
        } catch (err: any) {
          console.warn('[Prisma] Failed to write message send to SQL:', err.message);
        }
      }

      // --- Trigger Gemini Assistant if triggered ---
      const textLower = msgData.text.toLowerCase();
      const isAiLounge = msgData.channelId === 'ai-lounge';
      const mentionsGemini = textLower.includes('@gemini') || textLower.includes('gemini');

      if ((isAiLounge || mentionsGemini) && msgData.userId !== 'system-bot' && msgData.userId !== 'gemini-bot') {
        io.to(`channel:${msgData.channelId}`).emit('typing:start', { userId: 'gemini-bot', username: 'Gemini AI Buddy' });

        try {
          let aiResponseText = "I would love to help, but my API key is not configured in this workspace yet. You can set it in Settings > Secrets!";
          
          if (ai) {
            const prompt = `You are "Gemini AI Buddy", an expert software engineering teammate inside a developer chat app called DevPulse. 
You are responding to a user named ${msgData.username} who has the role: ${msgData.role}.
The user says: "${msgData.text}"

Please provide a helpful, concise, markdown-formatted, developer-friendly response. 
If they ask for code, provide a beautiful snippet with correct language syntax highlighting. Keep it extremely precise and elegant.`;

            const result = await ai.models.generateContent({
              model: 'gemini-3.5-flash',
              contents: prompt
            });
            aiResponseText = result.text || "I processed that, but had no output.";
          } else {
            if (msgData.text.includes('hello') || msgData.text.includes('hi')) {
              aiResponseText = "Hey there! 👋 I am **Gemini AI Buddy**, your coding assistant. Send me questions, ask me to explain algorithms, refit React hooks, or debug database queries right here! (To enable live responses, make sure your `GEMINI_API_KEY` is configured)";
            }
          }

          setTimeout(() => {
            const aiMsg: DevMessage = {
              id: `ai-${Date.now()}`,
              channelId: msgData.channelId,
              userId: 'gemini-bot',
              username: 'Gemini AI Buddy',
              role: 'AI Pair Partner',
              avatarEmoji: '🤖',
              text: aiResponseText,
              timestamp: new Date().toISOString(),
              repliesCount: 0,
              reactions: []
            };
            db.addMessage(aiMsg);
            io.to(`channel:${msgData.channelId}`).emit('message:new', aiMsg);
            io.to(`channel:${msgData.channelId}`).emit('typing:stop', { userId: 'gemini-bot' });
          }, 1500);

        } catch (err) {
          console.error('Gemini error:', err);
          io.to(`channel:${msgData.channelId}`).emit('typing:stop', { userId: 'gemini-bot' });
        }
      }
    });

    // Reactions
    socket.on('message:react', ({ messageId, emoji, userId, channelId }: { messageId: string; emoji: string; userId: string; channelId: string }) => {
      const updatedMsg = db.addReaction(messageId, emoji, userId);
      if (updatedMsg) {
        io.to(`channel:${channelId}`).emit('message:update', updatedMsg);
      }
    });

    socket.on('message:unreact', ({ messageId, emoji, userId, channelId }: { messageId: string; emoji: string; userId: string; channelId: string }) => {
      const updatedMsg = db.removeReaction(messageId, emoji, userId);
      if (updatedMsg) {
        io.to(`channel:${channelId}`).emit('message:update', updatedMsg);
      }
    });

    // Thread replies
    socket.on('thread:get-replies', (messageId: string) => {
      socket.emit('thread:replies-list', {
        messageId,
        replies: db.getThreadReplies(messageId)
      });
    });

    socket.on('thread:send-reply', (reply: ThreadReply) => {
      const savedReply = db.addThreadReply(reply);
      io.emit('thread:reply-new', savedReply);
      
      const updatedMsg = db.getMessage(reply.messageId);
      if (updatedMsg) {
        io.to(`channel:${updatedMsg.channelId}`).emit('message:update', updatedMsg);
      }
    });

    // Whiteboard Canvas Collaboration
    socket.on('whiteboard:draw', (elem: WhiteboardElement) => {
      const saved = db.saveWhiteboardElement(elem);
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

    // Real-Time Communities & Events Synchronization
    socket.on('event:rsvp-update', ({ eventId, rsvps, username }: { eventId: string; rsvps: string[]; username: string }) => {
      console.log(`[Socket] RSVP updated for event ${eventId}. Active RSVPs:`, rsvps);
      // Broadcast RSVP updates globally in real-time
      io.emit('event:rsvp-update', { eventId, rsvps });
    });

    socket.on('community:create', (newComm: any) => {
      console.log(`[Socket] Community created globally:`, newComm.name);
      io.emit('community:new', newComm);
    });

    socket.on('event:create', (newEvent: any) => {
      console.log(`[Socket] Event created globally:`, newEvent.title);
      io.emit('event:new', newEvent);
    });

    // Sandbox Terminal Commands
    socket.on('terminal:command', async ({ command, userId, username }: { command: string; userId: string; username: string }) => {
      const args = command.trim().split(' ');
      const baseCmd = args[0].toLowerCase();
      
      let output = '';
      let isError = false;

      switch (baseCmd) {
        case 'help':
          output = `Available DevPulse Commands:
  [[b;#58a6ff;]help]                     - List available console commands
  [[b;#58a6ff;]users]                    - List all developers currently on the platform
  [[b;#58a6ff;]git status]               - Mock Git repository and branch details
  [[b;#58a6ff;]pulse-stats]              - Real-time community health and database telemetry
  [[b;#58a6ff;]compile <language>]       - Run a simulated compilation pipeline
  [[b;#58a6ff;]ai <prompt>]              - Query Gemini AI directly from your developer console
  [[b;#58a6ff;]clear]                    - Clear terminal console history`;
          break;

        case 'users':
          const activeUsers = db.getUsers().filter(u => u.status === 'online');
          output = `Active Developer Sockets:\n` + activeUsers.map(u => {
            return `  - ${u.avatarEmoji} [[b;#3fb950;]${u.username}] [${u.role}] - XP: ${u.xpPoints} - ${u.status.toUpperCase()}`;
          }).join('\n');
          break;

        case 'git':
          if (args[1] === 'status') {
            output = `On branch [[b;#58a6ff;]main]
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	[[b;#f85149;]modified:   backend/sockets.ts]
	[[b;#f85149;]modified:   frontend/App.tsx]

no changes added to commit (use "git add" and/or "git commit -a")`;
          } else {
            output = `git: command not found or unsupported. Try "git status"`;
            isError = true;
          }
          break;

        case 'pulse-stats':
          const allUsers = db.getUsers();
          const chans = db.getChannels();
          const whiteboardCount = db.getWhiteboardElements().length;
          output = `[[b;#d854ff;]=== DEVPULSE PLATFORM TELEMETRY ===]
Active DB Store:      [[b;#58a6ff;]Prisma + PostgreSQL / Fallback JSON]
Online Engineers:     [[b;#3fb950;]${allUsers.filter(u => u.status === 'online').length} active / ${allUsers.length} total]
Discussion Channels:  [[b;#3fb950;]${chans.length} active spaces]
Canvas Elements:      [[b;#3fb950;]${whiteboardCount} collaborative drawing nodes]
Streak Champion:      [[b;#58a6ff;]${allUsers.length > 0 ? allUsers.reduce((max, u) => u.streakCount > max.streakCount ? u : max, allUsers[0]).username : 'None'}]`;
          break;

        case 'compile':
          const lang = args[1] || 'typescript';
          output = `[[b;#eed812;]>>> Spinning up sandboxed virtual environments...]
Compiling project pipeline for: [[b;#58a6ff;]${lang}]
Analyzing dependency trees...
Invoking Transpilers...
Linking binaries...
[[b;#3fb950;]Compilation successful!] 0 warnings, 0 errors. App served successfully.`;
          break;

        case 'ai':
          const prompt = args.slice(1).join(' ');
          if (!prompt) {
            output = `Usage: ai <prompt> (e.g. ai "write an Express.js route to upload file")`;
            isError = true;
            break;
          }
          
          socket.emit('terminal:response', {
            output: `[[b;#eed812;]Connecting to Gemini LLM Agent...] Asking: "${prompt}"...`,
            isPending: true
          });

          if (ai) {
            try {
              const res = await ai.models.generateContent({
                model: 'gemini-3.5-flash',
                contents: `You are a helpful sandbox terminal coding assistant in DevPulse. Please respond to the user query briefly and with formatting that looks amazing in a monospaced terminal environment. Here is their request: "${prompt}"`
              });
              output = res.text || "Empty response from AI.";
            } catch (err: any) {
              output = `AI error: ${err.message || err}`;
              isError = true;
            }
          } else {
            output = `Gemini AI capability is offline. Set process.env.GEMINI_API_KEY in Secrets panel to unlock sandbox AI!`;
            isError = true;
          }
          break;

        case 'clear':
          output = 'CLEAR_CONSOLE';
          break;

        default:
          output = `sh: command not found: ${baseCmd}. Type "help" to see valid DevPulse platform controls.`;
          isError = true;
      }

      socket.emit('terminal:response', { output, isError });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
      const socketState = activeSockets.get(socket.id);
      if (socketState) {
        db.updateUserStatus(socketState.userId, 'offline');
        
        // Notify others of room disconnect
        if (socketState.room) {
          socket.to(socketState.room).emit('user_left_room', { userId: socketState.userId });
        }

        activeSockets.delete(socket.id);
        broadcastPresence(io);
      }
    });
  });
}

function broadcastPresence(io: SocketIOServer) {
  const activeIds = Array.from(activeSockets.values()).map(s => s.userId);
  const allUsers = db.getUsers();
  
  const presenceList = allUsers.map(user => ({
    userId: user.id,
    username: user.username,
    role: user.role,
    avatarEmoji: user.avatarEmoji,
    status: activeIds.includes(user.id) ? 'online' : 'offline',
    customStatus: user.customStatus
  }));

  io.emit('presence:list', presenceList);
}
