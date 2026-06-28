import React, { useState, useEffect, useRef } from 'react';
import { 
  Hash, 
  MessageSquare, 
  Send, 
  Code, 
  X, 
  Copy, 
  Check, 
  Users, 
  ChevronDown, 
  Folder, 
  FileText,
  Activity, 
  Settings, 
  Compass, 
  LogOut, 
  Flame, 
  Zap, 
  Smile, 
  Paperclip, 
  Plus,
  Tv,
  Edit3,
  Calendar,
  ExternalLink,
  UserCheck
} from 'lucide-react';
import { socket } from '../socket';
import { DevUser, DevChannel, DevMessage, ThreadReply, ChatPresence, CodeSnippet } from '../types';

interface ChatWorkspaceProps {
  currentUser: DevUser;
  onLogout: () => void;
  openWhiteboard: () => void;
  isWhiteboardOpen: boolean;
  openTerminal: () => void;
  isTerminalOpen: boolean;
}

const LANGUAGES = ['javascript', 'typescript', 'python', 'rust', 'html', 'css', 'sql'];

const PythonIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 110 110" fill="currentColor" className="text-cyan-400 inline-block">
    <path d="M55 2C25.729 2 27.174 14.53 27.174 14.53l.011 12.98h27.917V31.5H15.013S2 30.137 2 59.387c0 29.25 11.513 27.95 11.513 27.95h10.25v-14.45s-.175-17.18 16.78-17.18h27.942c16.955 0 16.327-14.887 16.327-14.887v-24.3C84.812 16.52 84.27 2 55 2zm-12.83 8.35c2.427 0 4.4 1.973 4.4 4.4s-1.973 4.4-4.4 4.4-4.4-1.973-4.4-4.4 1.973-4.4 4.4-4.4z" fill="#387EB8"/>
    <path d="M55 108c29.271 0 27.826-12.53 27.826-12.53l-.011-12.98H54.9V78.5h40.087S108 79.863 108 50.613c0-29.25-11.513-27.95-11.513-27.95h-10.25v14.45s.175 17.18-16.78 17.18H41.515c-16.955 0-16.327 14.887-16.327 14.887v24.3c0 10.003.542 24.52 29.812 24.52zm12.83-8.35c2.427 0 4.4-1.973 4.4-4.4s-1.973-4.4-4.4-4.4-4.4 1.973-4.4 4.4 1.973 4.4 4.4 4.4z" fill="#FFE873"/>
  </svg>
);

export default function ChatWorkspace({ 
  currentUser, 
  onLogout, 
  openWhiteboard, 
  isWhiteboardOpen,
  openTerminal,
  isTerminalOpen
}: ChatWorkspaceProps) {
  
  // States
  const [activeTab, setActiveTab] = useState<'chats' | 'communities' | 'events'>('chats');
  const [activeCommunityId, setActiveCommunityId] = useState<string>('comm-global');
  const [selectedEventId, setSelectedEventId] = useState<string>('evt-1');

  const [communities, setCommunities] = useState([
    {
      id: 'comm-global',
      name: 'Global Workspace',
      description: 'The general workspace for all global announcements, news, and system integrations.',
      channels: ['general', 'bugs-and-fixes', 'showcase']
    },
    {
      id: 'comm-frontend',
      name: 'Frontend Wizards',
      description: 'CSS gurus, React and Vue speedsters, layout architects, and UI/UX designers.',
      channels: ['react-vite', 'showcase']
    },
    {
      id: 'comm-backend',
      name: 'Backend Engineering',
      description: 'Systems architecture, high-availability setups, database clustering, and APIs.',
      channels: ['node-api', 'system-design']
    }
  ]);

  const [events, setEvents] = useState([
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
  ]);

  const [channels, setChannels] = useState<DevChannel[]>([]);
  const [activeChannel, setActiveChannel] = useState<string>('general');
  const [messages, setMessages] = useState<DevMessage[]>([]);
  const [text, setText] = useState<string>('');
  
  // Collaborative presence
  const [presences, setPresences] = useState<ChatPresence[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({}); // userId -> username
  const [isTyping, setIsTyping] = useState<boolean>(false);
  
  // Code snippet modal states
  const [isSnippetModalOpen, setIsSnippetModalOpen] = useState<boolean>(false);
  const [snippetCode, setSnippetCode] = useState<string>('');
  const [snippetLang, setSnippetLang] = useState<string>('typescript');
  const [snippetTitle, setSnippetTitle] = useState<string>('');

  // Thread panel states
  const [activeThreadMsg, setActiveThreadMsg] = useState<DevMessage | null>(null);
  const [threadReplies, setThreadReplies] = useState<ThreadReply[]>([]);
  const [threadText, setThreadText] = useState<string>('');

  // Create channel modal states
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState<boolean>(false);
  const [newChannelName, setNewChannelName] = useState<string>('');
  const [newChannelDesc, setNewChannelDesc] = useState<string>('');
  const [newChannelCat, setNewChannelCat] = useState<'Channels' | 'Guilds'>('Channels');

  // Create Community and Event modal states
  const [isCreateCommunityOpen, setIsCreateCommunityOpen] = useState<boolean>(false);
  const [newCommunityName, setNewCommunityName] = useState<string>('');
  const [newCommunityDesc, setNewCommunityDesc] = useState<string>('');

  const [isCreateEventOpen, setIsCreateEventOpen] = useState<boolean>(false);
  const [newEventTitle, setNewEventTitle] = useState<string>('');
  const [newEventDesc, setNewEventDesc] = useState<string>('');
  const [newEventDate, setNewEventDate] = useState<string>('');
  const [newEventMeetLink, setNewEventMeetLink] = useState<string>('');
  const [newEventCommunityId, setNewEventCommunityId] = useState<string>('comm-global');

  // Selected User Panel
  const [selectedUser, setSelectedUser] = useState<DevUser | null>(null);

  // Command Palette states
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [commandPaletteSearch, setCommandPaletteSearch] = useState<string>('');

  // Code runner states
  const [runningSnippetId, setRunningSnippetId] = useState<string | null>(null);
  const [snippetOutputs, setSnippetOutputs] = useState<Record<string, string[]>>({});

  // Copied states for snippets
  const [copiedId, setCopiedId] = useState<string>('');

  // Refs for scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom
  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threadReplies]);

  // Handle socket.io hooks
  useEffect(() => {
    // 1. Initial Lists
    socket.on('init:channels', (chans: DevChannel[]) => {
      setChannels(chans);
    });

    socket.on('channel:new', (chan: DevChannel) => {
      setChannels((prev) => {
        if (prev.some(c => c.id === chan.id)) return prev;
        return [...prev, chan];
      });
    });

    socket.on('init:messages', (msgs: DevMessage[]) => {
      setMessages(msgs);
    });

    socket.on('message:new', (msg: DevMessage) => {
      if (msg.channelId === activeChannel) {
        setMessages((prev) => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    });

    socket.on('message:update', (msg: DevMessage) => {
      if (msg.channelId === activeChannel) {
        setMessages((prev) => prev.map(m => m.id === msg.id ? msg : m));
      }
      if (activeThreadMsg && activeThreadMsg.id === msg.id) {
        setActiveThreadMsg(msg);
      }
    });

    // 2. Typing Sync
    socket.on('typing:start', ({ userId, username }: { userId: string; username: string }) => {
      setTypingUsers((prev) => ({ ...prev, [userId]: username }));
    });

    socket.on('typing:stop', ({ userId }: { userId: string }) => {
      setTypingUsers((prev) => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
    });

    // 3. Presence list
    socket.on('presence:list', (list: ChatPresence[]) => {
      setPresences(list);
    });

    // 4. Thread Replies sync
    socket.on('thread:replies-list', ({ messageId, replies }: { messageId: string; replies: ThreadReply[] }) => {
      if (activeThreadMsg && activeThreadMsg.id === messageId) {
        setThreadReplies(replies);
      }
    });

    socket.on('thread:reply-new', (reply: ThreadReply) => {
      if (activeThreadMsg && activeThreadMsg.id === reply.messageId) {
        setThreadReplies((prev) => [...prev, reply]);
      }
    });

    socket.on('event:rsvp-update', ({ eventId, rsvps }: { eventId: string; rsvps: string[] }) => {
      setEvents((prev) => prev.map(evt => evt.id === eventId ? { ...evt, rsvps } : evt));
    });

    socket.on('community:new', (comm: any) => {
      setCommunities((prev) => {
        if (prev.some(c => c.id === comm.id)) return prev;
        return [...prev, comm];
      });
    });

    socket.on('event:new', (evt: any) => {
      setEvents((prev) => {
        if (prev.some(e => e.id === evt.id)) return prev;
        return [...prev, evt];
      });
    });

    return () => {
      socket.off('init:channels');
      socket.off('channel:new');
      socket.off('init:messages');
      socket.off('message:new');
      socket.off('message:update');
      socket.off('typing:start');
      socket.off('typing:stop');
      socket.off('presence:list');
      socket.off('thread:replies-list');
      socket.off('thread:reply-new');
      socket.off('event:rsvp-update');
      socket.off('community:new');
      socket.off('event:new');
    };
  }, [activeChannel, activeThreadMsg]);

  // Load initial communities and events from backend on mount
  useEffect(() => {
    const loadBackendData = async () => {
      try {
        const commRes = await fetch('/api/communities');
        if (commRes.ok) {
          const commData = await commRes.json();
          if (commData && commData.length > 0) {
            setCommunities(commData);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch communities from backend, using defaults:', err);
      }

      try {
        const evtRes = await fetch('/api/events');
        if (evtRes.ok) {
          const evtData = await evtRes.json();
          if (evtData && evtData.length > 0) {
            setEvents(evtData);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch events from backend, using defaults:', err);
      }
    };

    loadBackendData();
  }, []);

  // Global keyboard shortcuts (Ctrl+K, Cmd+K, etc.)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle Command Palette on Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      // Close Command Palette on Escape
      if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Trigger Typing emits
  useEffect(() => {
    if (!text.trim()) {
      if (isTyping) {
        setIsTyping(false);
        socket.emit('typing:stop', { userId: currentUser.id, channelId: activeChannel });
      }
      return;
    }

    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing:start', { userId: currentUser.id, username: currentUser.username, channelId: activeChannel });
    }

    const delayDebounceFn = setTimeout(() => {
      setIsTyping(false);
      socket.emit('typing:stop', { userId: currentUser.id, channelId: activeChannel });
    }, 2000);

    return () => clearTimeout(delayDebounceFn);
  }, [text]);

  const selectChannel = (channelId: string) => {
    setActiveChannel(channelId);
    socket.emit('user:join-channel', { userId: currentUser.id, channelId });
    if (activeThreadMsg) setActiveThreadMsg(null);
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    const newMsg: DevMessage = {
      id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      channelId: activeChannel,
      userId: currentUser.id,
      username: currentUser.username,
      role: currentUser.role,
      avatarEmoji: currentUser.avatarEmoji,
      text: text.trim(),
      timestamp: new Date().toISOString(),
      repliesCount: 0,
      reactions: []
    };

    socket.emit('message:send', newMsg);
    setText('');
  };

  const handleSendSnippet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!snippetCode.trim() || !snippetTitle.trim()) return;

    const newMsg: DevMessage = {
      id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      channelId: activeChannel,
      userId: currentUser.id,
      username: currentUser.username,
      role: currentUser.role,
      avatarEmoji: currentUser.avatarEmoji,
      text: `Created a new codebase snapshot: **${snippetTitle}**`,
      timestamp: new Date().toISOString(),
      codeSnippet: {
        code: snippetCode,
        language: snippetLang,
        title: snippetTitle
      },
      repliesCount: 0,
      reactions: []
    };

    socket.emit('message:send', newMsg);
    
    // Clear snippet inputs
    setSnippetCode('');
    setSnippetTitle('');
    setIsSnippetModalOpen(false);
  };

  const renderSyntaxCode = (code: string, lang: string) => {
    const lines = code.split('\n');
    return (
      <div className="font-mono text-[11px] leading-relaxed select-text">
        {lines.map((line, idx) => {
          let lineContent: React.ReactNode = line;
          
          if (lang === 'python') {
            if (line.includes('import python ap')) {
              lineContent = (
                <>
                  <span className="text-purple-400 font-medium">import</span> python <span className="text-purple-400 font-medium">ap</span>
                </>
              );
            } else if (line.includes('def process_data(data):')) {
              lineContent = (
                <>
                  <span className="text-purple-400 font-medium">def</span> <span className="text-teal-400 font-medium">process_data</span>(data):
                </>
              );
            } else if (line.includes('for in in istself.load(self):')) {
              lineContent = (
                <>
                  &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-purple-400 font-medium">for</span> in <span className="text-purple-400 font-medium">in</span> istself.load(self):
                </>
              );
            } else if (line.includes('at = no.quirt("Script <* testhon")')) {
              lineContent = (
                <>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;at = no.quirt(<span className="text-emerald-400">"Script &lt;* testhon"</span>)
                </>
              );
            } else if (line.includes('print(codes.load(self))')) {
              lineContent = (
                <>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-cyan-400 font-medium">print</span>(codes.load(<span className="text-orange-400 italic">self</span>))
                </>
              );
            } else {
              let highlighted = line
                .replace(/(def|import|for|in|print|as|if|else|return|class)/g, '<span class="text-purple-400 font-medium">$1</span>')
                .replace(/self/g, '<span class="text-orange-400 italic">self</span>');
              lineContent = <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
            }
          } else if (lang === 'typescript' || lang === 'javascript') {
            let highlighted = line
              .replace(/(import|export|default|function|const|let|return|from|if|else)/g, '<span class="text-purple-400 font-medium">$1</span>')
              .replace(/(useRef|useEffect|useThrottle|useState)/g, '<span class="text-blue-400">$1</span>')
              .replace(/('([^']*)'|"([^"]*)")/g, '<span class="text-emerald-400">$1</span>');
            lineContent = <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
          }
          
          return (
            <div key={idx} className="flex hover:bg-white/5 px-2 -mx-2">
              <span className="w-8 text-right pr-3 text-gray-600 select-none text-[10px] border-r border-gray-800/30 mr-3">{idx + 1}</span>
              <span className="flex-1 whitespace-pre">{lineContent}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const runCodeSnippet = (snippetId: string, title: string, code: string) => {
    setRunningSnippetId(snippetId);
    setSnippetOutputs(prev => ({
      ...prev,
      [snippetId]: [`$ python ${title || 'process_data.py'}`]
    }));

    const logs = [
      `Connecting to DevPulse sandbox runtime container...`,
      `Verified Python interpreter environment [py3.11-slim]`,
      `Parsing Python source AST...`,
      `[STDOUT] Script <* testhon`,
      `[STDOUT] codes.load trace result: { "success": true, "bytes": 1024 }`,
      `Process exited successfully with exit_code=0`
    ];

    let currentLogIdx = 0;
    const interval = setInterval(() => {
      setSnippetOutputs(prev => {
        const prevLogs = prev[snippetId] || [];
        if (currentLogIdx < logs.length) {
          const nextLog = logs[currentLogIdx];
          currentLogIdx++;
          return {
            ...prev,
            [snippetId]: [...prevLogs, nextLog]
          };
        } else {
          clearInterval(interval);
          setRunningSnippetId(null);
          return prev;
        }
      });
    }, 400);
  };

  const renderInteractiveCodeSnippet = (msg: DevMessage) => {
    if (!msg.codeSnippet) return null;
    const isRunning = runningSnippetId === msg.id;
    const outputs = snippetOutputs[msg.id] || [];
    
    return (
      <div className="mt-3.5 border border-[#30363d]/80 rounded-xl overflow-hidden bg-[#0d0f12] shadow-2xl relative">
        <div className="bg-[#161b22] px-4 py-2 border-b border-[#30363d]/70 flex items-center justify-between text-xs text-[#8b949e]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 select-none">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56] block border border-[#e0443e]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e] block border border-[#dea123]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f] block border border-[#1aab29]" />
            </div>
            <span className="font-mono flex items-center gap-2 text-[11px] text-[#c9d1d9] ml-1">
              <FileText size={12} className="text-cyan-400" />
              {msg.codeSnippet.title}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => runCodeSnippet(msg.id, msg.codeSnippet!.title, msg.codeSnippet!.code)}
              disabled={isRunning}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold transition-all ${
                isRunning
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 active:scale-95'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full bg-emerald-400 ${isRunning ? 'animate-ping' : ''}`} />
              {isRunning ? 'Running...' : 'Run Code'}
            </button>
            
            <button
              onClick={() => copyCode(msg.codeSnippet!.code, msg.id)}
              className="text-[#8b949e] hover:text-white flex items-center gap-1.5 px-2 py-1 hover:bg-gray-800 rounded-md transition-colors cursor-pointer"
            >
              {copiedId === msg.id ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
              <span className="text-[10px]">{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        <div className="p-4 overflow-x-auto bg-[#07080a] max-h-72 border-b border-[#1f242c] scrollbar-thin">
          {renderSyntaxCode(msg.codeSnippet.code, msg.codeSnippet.language)}
        </div>

        {(isRunning || outputs.length > 0) && (
          <div className="bg-[#040507] border-t border-[#1f242c] p-3 font-mono text-[10px] text-gray-400 select-text animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between text-[9px] text-[#8b949e] uppercase font-bold tracking-wider mb-2 border-b border-[#1f242c]/50 pb-1">
              <span>Sandbox Console Terminal Output</span>
              <span className="text-[#3fb950] animate-pulse">● online</span>
            </div>
            <div className="space-y-1">
              {outputs.map((line, idx) => {
                let textClass = 'text-gray-300';
                if (line.startsWith('$')) textClass = 'text-cyan-400 font-bold';
                else if (line.startsWith('[STDOUT]')) textClass = 'text-emerald-400 font-medium';
                else if (line.includes('exit_code=0') || line.includes('successfully')) textClass = 'text-green-400 font-bold';
                else if (line.includes('AST') || line.includes('virtualenv')) textClass = 'text-purple-400';
                
                return (
                  <div key={idx} className={`leading-relaxed ${textClass}`}>
                    {line}
                  </div>
                );
              })}
              {isRunning && (
                <div className="flex items-center gap-1.5 text-amber-400 font-medium">
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping" />
                  <span>evaluating bytecode...</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleReact = (messageId: string, emoji: string) => {
    const msg = messages.find(m => m.id === messageId);
    if (!msg) return;

    const existingReaction = msg.reactions?.find(r => r.emoji === emoji);
    const hasReacted = existingReaction?.userIds.includes(currentUser.id);

    if (hasReacted) {
      socket.emit('message:unreact', { messageId, emoji, userId: currentUser.id, channelId: activeChannel });
    } else {
      socket.emit('message:react', { messageId, emoji, userId: currentUser.id, channelId: activeChannel });
    }
  };

  // Thread utilities
  const openThread = (msg: DevMessage) => {
    setActiveThreadMsg(msg);
    socket.emit('thread:get-replies', msg.id);
  };

  const sendThreadReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!threadText.trim() || !activeThreadMsg) return;

    const newReply: ThreadReply = {
      id: `reply-${Date.now()}`,
      messageId: activeThreadMsg.id,
      userId: currentUser.id,
      username: currentUser.username,
      role: currentUser.role,
      avatarEmoji: currentUser.avatarEmoji,
      text: threadText.trim(),
      timestamp: new Date().toISOString()
    };

    socket.emit('thread:send-reply', newReply);
    setThreadText('');
  };

  // Create Channel Utilities
  const handleCreateChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    const normalizedName = newChannelName.trim().toLowerCase().replace(/\s+/g, '-');
    socket.emit('channel:create', {
      name: normalizedName,
      description: newChannelDesc,
      category: newChannelCat
    });

    setNewChannelName('');
    setNewChannelDesc('');
    setIsCreateChannelOpen(false);
  };

  const handleToggleRSVP = async (eventId: string) => {
    // 1. Optimistic UI update using username (matches backend logic)
    setEvents((prev) => prev.map((evt) => {
      if (evt.id === eventId) {
        const isRsvped = evt.rsvps.includes(currentUser.username);
        const newRsvps = isRsvped 
          ? evt.rsvps.filter(username => username !== currentUser.username)
          : [...evt.rsvps, currentUser.username];
        
        socket.emit('event:rsvp-update', { eventId, rsvps: newRsvps, username: currentUser.username });
        return { ...evt, rsvps: newRsvps };
      }
      return evt;
    }));

    // 2. Persist to API
    try {
      await fetch(`/api/events/${eventId}/rsvp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer devuser_${currentUser.username}_${currentUser.id}`
        }
      });
    } catch (err) {
      console.warn('Backend RSVP failed, falling back to real-time socket:', err);
    }
  };

  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommunityName.trim()) return;

    try {
      const res = await fetch('/api/communities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer devuser_${currentUser.username}_${currentUser.id}`
        },
        body: JSON.stringify({
          name: newCommunityName.trim(),
          description: newCommunityDesc.trim()
        })
      });

      if (res.ok) {
        const newComm = await res.json();
        setCommunities((prev) => {
          if (prev.some(c => c.id === newComm.id)) return prev;
          return [...prev, newComm];
        });
        socket.emit('community:create', newComm);
      }
    } catch (err) {
      console.warn('Backend community creation failed:', err);
    }

    setNewCommunityName('');
    setNewCommunityDesc('');
    setIsCreateCommunityOpen(false);
  };

  const handleJoinCommunity = async (communityId: string) => {
    // Optimistic UI update
    setCommunities((prev) => prev.map((comm) => {
      if (comm.id === communityId) {
        const updatedMembers = comm.members ? [...comm.members] : [];
        if (!updatedMembers.includes(currentUser.username)) {
          updatedMembers.push(currentUser.username);
        }
        return { ...comm, members: updatedMembers };
      }
      return comm;
    }));

    try {
      await fetch(`/api/communities/${communityId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer devuser_${currentUser.username}_${currentUser.id}`
        }
      });
    } catch (err) {
      console.warn('Backend community join failed:', err);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim() || !newEventDate.trim()) return;

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer devuser_${currentUser.username}_${currentUser.id}`
        },
        body: JSON.stringify({
          title: newEventTitle.trim(),
          description: newEventDesc.trim(),
          date: newEventDate,
          meetLink: newEventMeetLink.trim(),
          communityId: newEventCommunityId
        })
      });

      if (res.ok) {
        const newEvt = await res.json();
        setEvents((prev) => {
          if (prev.some(e => e.id === newEvt.id)) return prev;
          return [...prev, newEvt];
        });
        socket.emit('event:create', newEvt);
      }
    } catch (err) {
      console.warn('Backend event creation failed:', err);
    }

    setNewEventTitle('');
    setNewEventDesc('');
    setNewEventDate('');
    setNewEventMeetLink('');
    setIsCreateEventOpen(false);
  };

  useEffect(() => {
    if (activeTab === 'events' && selectedEventId) {
      const targetChanId = `event-${selectedEventId}`;
      setActiveChannel(targetChanId);
      socket.emit('user:join-channel', { userId: currentUser.id, channelId: targetChanId });
    }
  }, [activeTab, selectedEventId]);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(''), 2000);
  };

  // Custom Parser for markdown elements & triple backtick code blocks
  const renderMessageText = (txt: string) => {
    if (!txt) return null;

    // Split by triple backticks to find code blocks
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    // Reset regex index
    codeBlockRegex.lastIndex = 0;

    let index = 0;
    while ((match = codeBlockRegex.exec(txt)) !== null) {
      const textBefore = txt.substring(lastIndex, match.index);
      const language = match[1] || 'plaintext';
      const code = match[2];

      // Process standard text before the code block
      if (textBefore) {
        parts.push(<span key={`text-${index}`}>{renderInlineMarkdown(textBefore)}</span>);
      }

      // Render the code block
      parts.push(
        <div key={`code-${index}`} className="my-3 border border-[#30363d] rounded-md overflow-hidden bg-[#161b22]">
          <div className="bg-[#21262d] px-3 py-1.5 border-b border-[#30363d] flex items-center justify-between text-xs text-[#8b949e]">
            <span className="font-mono flex items-center gap-1.5">
              <Code size={12} className="text-blue-400" />
              {language}
            </span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(code);
                setCopiedId(`cb-${index}`);
                setTimeout(() => setCopiedId(''), 2000);
              }}
              className="text-[#8b949e] hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
            >
              {copiedId === `cb-${index}` ? (
                <>
                  <Check size={12} className="text-green-500" />
                  <span className="text-[10px]">Copied</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span className="text-[10px]">Copy</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-3 overflow-x-auto text-xs font-mono text-gray-300 bg-[#0d1117] max-h-60 scrollbar-thin">
            <code>{code}</code>
          </pre>
        </div>
      );

      lastIndex = codeBlockRegex.lastIndex;
      index++;
    }

    const textRemaining = txt.substring(lastIndex);
    if (textRemaining) {
      parts.push(<span key={`text-remaining`}>{renderInlineMarkdown(textRemaining)}</span>);
    }

    return parts;
  };

  const renderInlineMarkdown = (inlineText: string) => {
    const inlineParts = inlineText.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return inlineParts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold text-white">{part.slice(2, -2)}</strong>;
      } else if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={index} className="font-mono text-[11px] bg-[#21262d] px-1.5 py-0.5 rounded text-fuchsia-400 border border-[#30363d]">{part.slice(1, -1)}</code>;
      } else {
        return part;
      }
    });
  };

  const getEventFromText = (txt: string) => {
    if (!txt) return null;
    const match = txt.match(/(?:events\/|evt-)([a-zA-Z0-9\-]+)/i);
    if (match) {
      const matchId = match[1];
      const found = events.find(e => e.id.toLowerCase() === matchId.toLowerCase() || e.id.toLowerCase() === `evt-${matchId}`.toLowerCase());
      return found || null;
    }
    return null;
  };

  const renderEventPreviewCard = (msgText: string) => {
    const event = getEventFromText(msgText);
    if (!event) return null;

    return (
      <div className="mt-2.5 p-3.5 border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 rounded-lg flex items-center justify-between gap-4 max-w-sm shadow-lg border-dashed transition-all">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            <span className="text-[10px] font-bold text-amber-400 font-mono tracking-wider">EVENT LINK ATTACHED</span>
          </div>
          <h4 className="text-[11px] font-bold text-white truncate">{event.title}</h4>
          <p className="text-[10px] text-gray-400 truncate mt-0.5">{event.description}</p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-[9px] bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 rounded">
              📅 {event.date}
            </span>
          </div>
        </div>
        <button
          onClick={() => {
            setActiveTab('events');
            setSelectedEventId(event.id);
          }}
          className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-[10px] rounded flex items-center gap-1 transition-all flex-shrink-0 shadow-sm cursor-pointer"
        >
          <span>View</span>
          <ExternalLink size={10} />
        </button>
      </div>
    );
  };

  const currentActiveChanInfo = channels.find(c => c.id === activeChannel);
  const selectedEvent = events.find(e => e.id === selectedEventId);
  const isEventMode = activeTab === 'events';

  const headerTitle = isEventMode 
    ? (selectedEvent ? `Event: ${selectedEvent.title}` : 'Select an Event')
    : (currentActiveChanInfo?.name || 'Loading');

  const headerDesc = isEventMode
    ? (selectedEvent ? `Hosted by @${selectedEvent.creator} • ${selectedEvent.rsvps.length} developers attending` : '')
    : (currentActiveChanInfo?.description || 'Developer collaboration node.');

  return (
    <div className="flex-1 flex bg-[#07090e] h-full overflow-hidden text-[#e1e4ea] relative font-sans">
      
      {/* PANE 1: VERTICAL THIN NAVIGATION SIDEBAR */}
      <div className="w-16 bg-[#090b11] border-r border-[#1a2333] flex flex-col items-center py-5 justify-between select-none flex-shrink-0 z-10">
        <div className="flex flex-col gap-5 items-center w-full">
          {/* Active app icon / header */}
          <div className="p-2.5 bg-gradient-to-br from-cyan-500/15 to-blue-500/5 text-cyan-400 border border-cyan-500/25 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.15)] animate-pulse" title="DevPulse System">
            <Flame size={18} />
          </div>

          <div className="h-[1px] w-8 bg-[#1f293d]" />

          {/* Navigation Items */}
          <button
            onClick={() => setActiveTab('chats')}
            className={`p-3 rounded-xl transition-all duration-300 cursor-pointer relative group ${
              activeTab === 'chats' 
                ? 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/25 shadow-[0_0_12px_rgba(6,182,212,0.15)] font-bold' 
                : 'text-gray-500 hover:text-white hover:bg-white/[0.02]'
            }`}
            title="Chat Discussion Spaces"
          >
            <MessageSquare size={18} />
            <span className="absolute left-20 scale-0 group-hover:scale-100 transition-all bg-black/95 text-white border border-[#1f293d] text-[10px] px-2.5 py-1 rounded-md shadow-2xl font-mono whitespace-nowrap z-50">
              Chats
            </span>
          </button>

          <button
            onClick={() => setActiveTab('communities')}
            className={`p-3 rounded-xl transition-all duration-300 cursor-pointer relative group ${
              activeTab === 'communities' 
                ? 'text-purple-400 bg-purple-500/10 border border-purple-500/25 shadow-[0_0_12px_rgba(168,85,247,0.15)] font-bold' 
                : 'text-gray-500 hover:text-white hover:bg-white/[0.02]'
            }`}
            title="Developer Communities"
          >
            <Users size={18} />
            <span className="absolute left-20 scale-0 group-hover:scale-100 transition-all bg-black/95 text-white border border-[#1f293d] text-[10px] px-2.5 py-1 rounded-md shadow-2xl font-mono whitespace-nowrap z-50">
              Communities
            </span>
          </button>

          <button
            onClick={() => setActiveTab('events')}
            className={`p-3 rounded-xl transition-all duration-300 cursor-pointer relative group ${
              activeTab === 'events' 
                ? 'text-amber-400 bg-amber-500/10 border border-amber-500/25 shadow-[0_0_12px_rgba(245,158,11,0.15)] font-bold' 
                : 'text-gray-500 hover:text-white hover:bg-white/[0.02]'
            }`}
            title="Schedules & Technical Events"
          >
            <Calendar size={18} />
            <span className="absolute left-20 scale-0 group-hover:scale-100 transition-all bg-black/95 text-white border border-[#1f293d] text-[10px] px-2.5 py-1 rounded-md shadow-2xl font-mono whitespace-nowrap z-50">
              Events
            </span>
          </button>
        </div>

        {/* User Presence indicator at the bottom */}
        <div className="flex flex-col gap-4 items-center">
          <div className="relative group cursor-pointer hover:scale-110 transition-transform duration-200" onClick={() => setSelectedUser(currentUser)}>
            <span className="text-xl">{currentUser.avatarEmoji}</span>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#090b11] shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
          </div>

          <button 
            onClick={onLogout}
            className="text-gray-500 hover:text-red-400 p-2.5 hover:bg-red-950/20 rounded-xl transition-all cursor-pointer"
            title="Disconnect Uplink"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* PANE 2: CONTEXT SIDEBAR */}
      <div className="w-60 bg-[#0c0e15] border-r border-[#1f293d] flex flex-col select-none flex-shrink-0">
        {/* Tab Context Header */}
        <div className="h-16 border-b border-[#1f293d] bg-[#111420]/80 px-4.5 flex items-center justify-between flex-shrink-0">
          <span className="font-extrabold tracking-wider text-white text-[10px] uppercase font-mono bg-clip-text text-transparent bg-gradient-to-r from-[#58a6ff] to-[#a5b4fc]">
            {activeTab === 'chats' && 'Discussion Hub'}
            {activeTab === 'communities' && 'Guild Spaces'}
            {activeTab === 'events' && 'Tech Calendars'}
          </span>
          <span className="text-[9px] bg-cyan-950/40 text-cyan-400 border border-cyan-500/20 px-2.5 py-0.5 rounded-full font-bold font-mono">
            {activeTab === 'chats' && `${channels.filter(c => c.category !== 'Direct Messages').length} active`}
            {activeTab === 'communities' && `${communities.length} guilds`}
            {activeTab === 'events' && `${events.length} schedule`}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin">
          {/* CHATS CONTEXT: Channels and Direct Messages */}
          {activeTab === 'chats' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="font-mono text-[10px] tracking-wider uppercase font-bold text-[#8b9ba8]">Active Dev Node</span>
                </div>
                <button 
                  onClick={() => setIsSnippetModalOpen(true)}
                  className="p-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 rounded-lg text-cyan-400 border border-cyan-500/25 transition-all cursor-pointer hover:scale-105"
                  title="Create New Snippet (Cmd+C)"
                >
                  <Plus size={13} />
                </button>
              </div>

              <button 
                onClick={() => setIsCommandPaletteOpen(true)}
                className="w-full flex items-center justify-between px-3 py-2 bg-[#05060a]/90 border border-[#1f293d] hover:border-cyan-500/40 rounded-xl text-left text-[11px] text-gray-400 font-mono transition-all group mb-3 shadow-inner"
              >
                <span className="group-hover:text-cyan-300 flex items-center gap-2">
                  <span className="text-cyan-400 font-bold">⌘</span> Search node...
                </span>
                <span className="text-[8px] bg-[#121622] text-gray-500 border border-[#1f293d] px-1.5 py-0.5 rounded font-mono shadow">⌘K</span>
              </button>

              <div className="space-y-1.5">
                {[
                  {
                    id: 'general',
                    name: 'general-discussion',
                    type: 'channel',
                    isPython: true,
                    unreadCount: 3,
                    time: '17m',
                    previewText: '[Python] fix_script...'
                  },
                  {
                    id: 'python-devs',
                    name: 'python-devs',
                    type: 'channel',
                    isPython: true,
                    unreadCount: 3,
                    time: '17m',
                    previewText: '[Python] fix_script...'
                  },
                  {
                    id: 'alex-g-dm',
                    name: 'Direct: Alex G.',
                    type: 'direct',
                    avatarEmoji: '👨‍💻',
                    unreadCount: 5,
                    time: '26m',
                    previewText: '[Python] fix_script...'
                  },
                  {
                    id: 'python-devs-2',
                    name: 'python-devs',
                    type: 'channel',
                    isPython: true,
                    unreadCount: 5,
                    time: '26m',
                    previewText: '[Python] fix_script...'
                  },
                  {
                    id: 'python-devs-3',
                    name: 'python-devs',
                    type: 'channel',
                    isPython: true,
                    unreadCount: 3,
                    time: '3m',
                    previewText: '[Python] rex_script...'
                  },
                  {
                    id: 'aynen-claat',
                    name: 'aynen-claat',
                    type: 'channel',
                    isPython: false,
                    unreadCount: 0,
                    time: '37m',
                    previewText: 'Established secure socket'
                  },
                  {
                    id: 'alex-g-dm-2',
                    name: 'Direct: Alex G.',
                    type: 'direct',
                    avatarEmoji: '👨‍💻',
                    unreadCount: 3,
                    time: '1m',
                    previewText: '[Python] fix_script...'
                  }
                ].map((conv, idx) => {
                  const isAlex = conv.id.includes('alex-g-dm');
                  const isCurrentActive = isAlex 
                    ? (activeChannel === 'alex-g-dm')
                    : (activeChannel === conv.id);
                  
                  return (
                    <button
                      key={`${conv.id}-${idx}`}
                      onClick={() => {
                        if (isAlex) {
                          selectChannel('alex-g-dm');
                        } else {
                          selectChannel(conv.id);
                        }
                      }}
                      className={`w-full flex flex-col p-3 rounded-xl border text-left transition-all relative cursor-pointer hover:-translate-y-0.5 duration-200 ${
                        isCurrentActive
                          ? 'bg-gradient-to-r from-cyan-500/15 to-blue-500/5 border-cyan-500/35 text-cyan-300 shadow-[0_4px_12px_rgba(6,182,212,0.15)] font-bold'
                          : 'bg-[#0f121d]/60 hover:bg-[#151928] border-transparent hover:border-[#1f293d] text-[#8b9ba8]'
                      }`}
                    >
                      <div className="w-full flex items-center justify-between">
                        <div className="flex items-center gap-2 font-mono text-xs font-bold truncate text-white">
                          {conv.type === 'channel' ? (
                            conv.isPython ? (
                              <PythonIcon size={12} />
                            ) : (
                              <span className="text-cyan-500 font-bold">#</span>
                            )
                          ) : (
                            <span className="text-xs p-1 bg-[#1c2235] rounded">{conv.avatarEmoji}</span>
                          )}
                          <span className="truncate">{conv.name}</span>
                        </div>
                        <span className="text-[9px] text-gray-500 font-mono flex-shrink-0">{conv.time}</span>
                      </div>

                      <div className="w-full flex items-center justify-between mt-1.5">
                        <span className="text-[10px] text-gray-400 font-mono truncate max-w-[130px]">
                          {conv.previewText}
                        </span>
                        {conv.unreadCount > 0 && (
                          <span className={`text-[9px] font-mono font-extrabold px-1.5 py-0.2 rounded-full flex items-center justify-center ${
                            isCurrentActive
                              ? 'bg-cyan-400 text-black shadow-[0_0_8px_rgba(34,211,238,0.5)]'
                              : 'bg-emerald-400 text-black font-extrabold'
                          }`}>
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* COMMUNITIES CONTEXT: Active Communities */}
          {activeTab === 'communities' && (
            <div className="space-y-3">
              <div className="text-[10px] font-bold text-[#8b949e] tracking-wider px-2 py-1 uppercase flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Users size={11} />
                  Joined Guilds
                </div>
                <button
                  onClick={() => setIsCreateCommunityOpen(true)}
                  className="text-purple-400 hover:text-purple-300 flex items-center gap-0.5 text-[10px] bg-purple-500/10 hover:bg-purple-500/20 px-1.5 py-0.5 rounded cursor-pointer transition-all"
                >
                  <Plus size={10} />
                  <span>New</span>
                </button>
              </div>

              {communities.map(comm => {
                const isActive = activeCommunityId === comm.id;
                const isMember = comm.members && (comm.members.includes(currentUser.id) || comm.members.includes(currentUser.username));
                return (
                  <div key={comm.id} className="space-y-1">
                    <button
                      onClick={() => setActiveCommunityId(comm.id)}
                      className={`w-full flex flex-col p-2.5 rounded-lg text-left transition-all border cursor-pointer ${
                        isActive 
                          ? 'bg-purple-600/10 border-purple-500/20 text-purple-300' 
                          : 'bg-transparent border-transparent text-[#8b949e] hover:bg-gray-800/50 hover:text-white'
                      }`}
                    >
                      <span className="text-xs font-bold text-white">{comm.name}</span>
                      <span className="text-[10px] text-gray-500 line-clamp-2 leading-snug mt-1">{comm.description}</span>
                    </button>

                    {/* Show channels of community if active */}
                    {isActive && (
                      <div className="pl-2 border-l border-purple-500/20 ml-2 mt-1 space-y-1 animate-in fade-in duration-200">
                        {isMember ? (
                          comm.channels && comm.channels.length > 0 ? (
                            comm.channels.map(chanId => {
                              const chan = channels.find(c => c.id === chanId);
                              const displayName = chan ? chan.name : chanId;
                              const isChanActive = activeChannel === chanId;
                              return (
                                <button
                                  key={chanId}
                                  onClick={() => selectChannel(chanId)}
                                  className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-mono transition-all text-left cursor-pointer ${
                                    isChanActive 
                                      ? 'text-purple-400 bg-purple-500/5 font-semibold' 
                                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                  }`}
                                >
                                  <Hash size={11} />
                                  <span>{displayName}</span>
                                </button>
                              );
                            })
                          ) : (
                            <div className="text-[10px] text-gray-500 pl-2">No channels created yet.</div>
                          )
                        ) : (
                          <div className="p-2.5 bg-[#1f1625] rounded-lg border border-purple-500/20 space-y-2 mt-1">
                            <p className="text-[10px] text-purple-200">You are not a member of this space yet.</p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleJoinCommunity(comm.id);
                              }}
                              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] py-1 px-2 rounded transition-all cursor-pointer text-center"
                            >
                              Join Space
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* EVENTS CONTEXT: technical schedule event blocks */}
          {activeTab === 'events' && (
            <div className="space-y-3">
              <div className="text-[10px] font-bold text-[#8b949e] tracking-wider px-2 py-1 uppercase flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Calendar size={11} />
                  Technical Events
                </div>
                <button
                  onClick={() => setIsCreateEventOpen(true)}
                  className="text-amber-400 hover:text-amber-300 flex items-center gap-0.5 text-[10px] bg-amber-500/10 hover:bg-amber-500/20 px-1.5 py-0.5 rounded cursor-pointer transition-all"
                >
                  <Plus size={10} />
                  <span>New</span>
                </button>
              </div>

              {events.map(evt => {
                const isActive = selectedEventId === evt.id;
                const rsvped = evt.rsvps && (evt.rsvps.includes(currentUser.id) || evt.rsvps.includes(currentUser.username));
                return (
                  <button
                    key={evt.id}
                    onClick={() => setSelectedEventId(evt.id)}
                    className={`w-full flex flex-col p-2.5 rounded-lg text-left transition-all border cursor-pointer ${
                      isActive 
                        ? 'bg-amber-600/10 border-amber-500/30 text-amber-300' 
                        : 'bg-transparent border-transparent text-[#8b949e] hover:bg-gray-800/50 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[10px] font-mono text-amber-400/80">{evt.date}</span>
                      {rsvped && (
                        <span className="text-[9px] bg-green-500/20 text-green-400 px-1.5 py-0.2 rounded font-semibold font-mono">RSVP</span>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-white mt-1">{evt.title}</span>
                    <span className="text-[10px] text-gray-500 mt-1 truncate w-full">{evt.description}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 2. MAIN CONVERSATION / CHAT PORT */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#07090e]">
        
        {/* Active Channel Header */}
        <div className="h-16 border-b border-[#1f293d] bg-[#0d0f17]/95 px-6 flex items-center justify-between z-10 flex-shrink-0 backdrop-blur-md shadow-sm">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {isEventMode ? (
                <Calendar size={16} className="text-amber-400 drop-shadow-[0_0_5px_rgba(245,158,11,0.4)]" />
              ) : (
                <Hash size={16} className="text-cyan-400 drop-shadow-[0_0_5px_rgba(6,182,212,0.4)] font-bold" />
              )}
              <h2 className="font-extrabold text-white text-sm tracking-wide">
                {isEventMode ? headerTitle : `#${headerTitle}`}
              </h2>
            </div>
            <p className="text-[11px] text-[#8b9ba8] truncate mt-0.5 font-mono">
              {headerDesc}
            </p>
          </div>

          {/* Quick Header toggles with gorgeous Pill structure */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={openWhiteboard}
              className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition-all border cursor-pointer hover:-translate-y-0.5 duration-200 ${
                isWhiteboardOpen
                  ? 'bg-gradient-to-r from-cyan-600/30 to-blue-600/20 text-cyan-300 border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                  : 'bg-[#121622] hover:bg-white/[0.02] text-gray-400 hover:text-white border-[#1f293d]'
              }`}
              title="Collaborative Design Board"
            >
              <Edit3 size={13} />
              <span>Blueprint Sketchboard</span>
            </button>

            <button
              onClick={openTerminal}
              className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition-all border cursor-pointer hover:-translate-y-0.5 duration-200 ${
                isTerminalOpen
                  ? 'bg-gradient-to-r from-emerald-600/30 to-teal-600/20 text-emerald-300 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                  : 'bg-[#121622] hover:bg-white/[0.02] text-gray-400 hover:text-white border-[#1f293d]'
              }`}
              title="Toggle Sandbox Command Console"
            >
              <Code size={13} />
              <span>Interactive Console</span>
            </button>
          </div>
        </div>

        {/* Main Conversation viewport */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
          {isEventMode && selectedEvent && (
            <div className="p-5 border border-amber-500/20 bg-[#1c1f26] rounded-xl flex flex-col md:flex-row justify-between gap-5 shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="space-y-3 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-semibold">
                    Technical Workshop
                  </span>
                  <span className="text-xs text-gray-500 font-mono">
                    Created by @{selectedEvent.creator}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white tracking-tight">{selectedEvent.title}</h3>
                <p className="text-xs text-[#c9d1d9] leading-relaxed">{selectedEvent.description}</p>
                
                <div className="flex items-center gap-3 text-xs text-gray-400 pt-1">
                  <span className="font-semibold text-amber-300 font-mono">📅 {selectedEvent.date}</span>
                  <span className="text-gray-600">|</span>
                  <a 
                    href={selectedEvent.meetLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-400 hover:underline hover:text-blue-300 font-mono text-[11px]"
                  >
                    <ExternalLink size={12} />
                    <span>Google Meet Link</span>
                  </a>
                </div>
              </div>

              <div className="flex flex-col justify-between items-start md:items-end gap-4 min-w-[200px] border-t md:border-t-0 md:border-l border-[#30363d] pt-4 md:pt-0 md:pl-5 flex-shrink-0">
                <div className="space-y-1.5 w-full">
                  <span className="text-[10px] font-bold text-[#8b949e] uppercase font-mono block">RSVP Status</span>
                  <button
                    type="button"
                    onClick={() => handleToggleRSVP(selectedEvent.id)}
                    className={`w-full flex items-center justify-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg transition-all cursor-pointer ${
                      selectedEvent.rsvps.includes(currentUser.id)
                        ? 'bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30'
                        : 'bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold border border-transparent'
                    }`}
                  >
                    <UserCheck size={14} />
                    <span>{selectedEvent.rsvps.includes(currentUser.id) ? 'Registered' : 'RSVP Now'}</span>
                  </button>
                </div>

                <div className="w-full">
                  <span className="text-[10px] font-bold text-[#8b949e] uppercase font-mono block mb-1">Attendees ({selectedEvent.rsvps.length})</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedEvent.rsvps.length === 0 ? (
                      <span className="text-[11px] text-gray-500 italic">No RSVPs yet. Be first!</span>
                    ) : (
                      selectedEvent.rsvps.map(username => (
                        <span 
                          key={username} 
                          className="text-[10px] bg-[#161b22] border border-[#30363d] text-gray-300 px-2 py-0.5 rounded-full font-mono"
                          title={`@${username}`}
                        >
                          @{username}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          {(() => {
            const activeMessages = [...messages];
            const isAlexDM = activeChannel === 'alex-g-dm';
            
            if (isAlexDM && !activeMessages.some(m => m.id === 'alex-g-seed-1')) {
              activeMessages.push({
                id: 'alex-g-seed-1',
                channelId: 'alex-g-dm',
                userId: 'alex-g',
                username: 'Alex Gamier',
                role: 'Lead Python Architect',
                avatarEmoji: '👨‍💻',
                text: "Don't even trying to fin the optimismut for your messages line head.",
                timestamp: new Date(Date.now() - 3600000).toISOString(),
                codeSnippet: {
                  title: 'process_data.py',
                  language: 'python',
                  code: `import python ap\n\ndef process_data(data):\n    for in in istself.load(self):\n        at = no.quirt("Script <* testhon")\n        print(codes.load(self))`
                },
                repliesCount: 0,
                reactions: []
              });
            }

            if (activeMessages.length === 0) {
              return (
                <div className="py-12 flex flex-col items-center justify-center text-center text-[#8b949e]">
                  <MessageSquare size={32} className="text-gray-700 mb-3" />
                  <p className="text-sm font-medium">This conversation is pristine.</p>
                  <p className="text-xs">Transmit a message to initialize discussions!</p>
                </div>
              );
            }

            return activeMessages.map((msg) => {
              const isMe = msg.userId === currentUser.id;
              return (
                <div key={msg.id} className="flex gap-3 group items-start hover:bg-gray-800/10 -mx-6 px-6 py-2 rounded-lg transition-colors">
                  
                  {/* Avatar */}
                  <div 
                    onClick={() => {
                      setSelectedUser({
                        id: msg.userId,
                        username: msg.username,
                        role: msg.role,
                        avatarEmoji: msg.avatarEmoji,
                        skills: [],
                        status: 'online',
                        streakCount: 1,
                        xpPoints: 0
                      });
                    }}
                    className="text-2xl cursor-pointer hover:scale-110 transition-transform flex-shrink-0"
                  >
                    {msg.avatarEmoji}
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-xs cursor-pointer hover:underline">
                        @{msg.username}
                      </span>
                      <span className="text-[9px] bg-blue-900/20 text-blue-400 px-1.5 py-0.2 rounded font-mono">
                        {msg.role}
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-xs text-[#c9d1d9] mt-1 leading-relaxed break-words">
                      {renderMessageText(msg.text)}
                    </p>

                    {/* Auto event preview card */}
                    {renderEventPreviewCard(msg.text)}

                    {/* Rendering Code Snippet if present */}
                    {msg.codeSnippet && renderInteractiveCodeSnippet(msg)}

                    {/* Reactions Toolbar */}
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {/* Interactive reactions */}
                      {['🚀', '🔥', '💻', '👍', '🧠'].map((emoji) => {
                        const reactObj = msg.reactions?.find(r => r.emoji === emoji);
                        const count = reactObj?.userIds.length || 0;
                        const active = reactObj?.userIds.includes(currentUser.id);

                        return (
                          <button
                            key={emoji}
                            onClick={() => handleReact(msg.id, emoji)}
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border font-mono transition-all cursor-pointer ${
                              active
                                ? 'bg-blue-600/10 text-blue-400 border-blue-500/40'
                                : 'bg-[#161b22] text-gray-500 border-transparent hover:border-gray-700'
                            }`}
                          >
                            <span>{emoji}</span>
                            <span>{count}</span>
                          </button>
                        );
                      })}

                      {/* Reply button */}
                      <button
                        onClick={() => openThread(msg)}
                        className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] bg-[#161b22] text-gray-400 border border-transparent hover:border-gray-700 transition-all cursor-pointer"
                      >
                        <MessageSquare size={10} />
                        <span>Replies ({msg.repliesCount || 0})</span>
                      </button>
                    </div>

                  </div>
                </div>
              );
            });
          })()}
          <div ref={messagesEndRef} />
        </div>

        {/* Dynamic Typing indicators */}
        {Object.keys(typingUsers).length > 0 && (
          <div className="px-6 py-2 text-[10px] text-cyan-400 bg-[#05070b]/90 border-t border-[#1f293d]/50 flex items-center gap-1.5 font-mono shadow-inner animate-pulse">
            <Activity size={10} className="text-cyan-400 animate-spin" />
            <span>
              {Object.values(typingUsers).join(', ')} {Object.keys(typingUsers).length === 1 ? 'is' : 'are'} transmitting packets...
            </span>
          </div>
        )}

        {/* Chat input box */}
        <form onSubmit={sendMessage} className="p-4.5 border-t border-[#1f293d] bg-[#0c0e15]/95 backdrop-blur-md">
          <div className="flex items-center bg-[#05060a]/90 border border-[#1f293d] focus-within:border-cyan-500/50 rounded-xl p-2 gap-2.5 transition-all shadow-inner">
            
            <button
              type="button"
              onClick={() => setIsSnippetModalOpen(true)}
              className="text-cyan-400 hover:text-cyan-300 p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg transition-all cursor-pointer"
              title="Post Code Snippet"
            >
              <Code size={15} />
            </button>

            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Transmit code or message to #${currentActiveChanInfo?.name || 'space'}...`}
              className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-[#e1e4ea] text-xs placeholder-gray-600 tracking-wide font-mono"
            />

            <button
              type="submit"
              disabled={!text.trim()}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-30 disabled:hover:from-cyan-600 disabled:hover:to-blue-600 text-black font-bold p-2.5 rounded-lg transition-all cursor-pointer flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)]"
            >
              <Send size={13} className="text-white" />
            </button>
          </div>
        </form>

      </div>

      {/* 3. RIGHT ACTIVE DEVELOPERS DIRECTORY PANEL */}
      <div className="w-56 bg-[#0c0e15] border-l border-[#1f293d] flex flex-col select-none">
        <div className="h-16 border-b border-[#1f293d] bg-[#111420]/80 px-4 flex items-center gap-2.5 flex-shrink-0">
          <Users size={14} className="text-cyan-400 drop-shadow-[0_0_5px_rgba(6,182,212,0.4)]" />
          <span className="text-xs font-bold tracking-wide text-white font-mono uppercase">Node Directory</span>
          <span className="text-[9px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 px-2 py-0.5 rounded-full font-bold font-mono ml-auto">
            {presences.filter(p => p.status === 'online').length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">
          {presences.map((pres) => (
            <div
              key={pres.userId}
              onClick={() => {
                setSelectedUser({
                  id: pres.userId,
                  username: pres.username,
                  role: pres.role,
                  avatarEmoji: pres.avatarEmoji,
                  skills: [],
                  status: pres.status,
                  streakCount: 3,
                  xpPoints: 120
                });
              }}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/[0.02] border border-transparent hover:border-[#1f293d]/50 transition-all cursor-pointer"
            >
              <div className="relative">
                <span className="text-xl p-1 bg-[#151928] rounded-lg border border-[#1f293d]/50 block">{pres.avatarEmoji}</span>
                <span className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-[#0c0e15] ${
                  pres.status === 'online' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-gray-600'
                }`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate hover:underline">@{pres.username}</p>
                <p className="text-[9px] text-gray-500 font-mono tracking-wider truncate uppercase">{pres.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. MODALS / SIDE PANELS DRAWERS */}
      
      {/* A. Dynamic Thread Sidebar Drawer */}
      {activeThreadMsg && (
        <div className="w-80 bg-[#161b22] border-l border-[#30363d] flex flex-col h-full overflow-hidden absolute top-0 right-0 z-20 shadow-2xl animate-in slide-in-from-right duration-200">
          <div className="h-14 border-b border-[#30363d] px-4 flex items-center justify-between">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <MessageSquare size={13} className="text-blue-400" />
              Threaded Discussion
            </span>
            <button 
              onClick={() => setActiveThreadMsg(null)}
              className="text-[#8b949e] hover:text-white transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          {/* Original Msg Card */}
          <div className="p-4 bg-[#0d1117] border-b border-[#30363d]">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{activeThreadMsg.avatarEmoji}</span>
              <span className="font-semibold text-white text-xs">@{activeThreadMsg.username}</span>
            </div>
            <p className="text-xs text-[#8b949e] line-clamp-3 leading-relaxed">
              {activeThreadMsg.text}
            </p>
          </div>

          {/* Thread list content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {threadReplies.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-[#8b949e]">
                <MessageSquare size={24} className="text-gray-700 mb-2" />
                <p className="text-xs">No responses yet.</p>
                <p className="text-[10px]">Start the conversation below!</p>
              </div>
            ) : (
              threadReplies.map((rep) => (
                <div key={rep.id} className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{rep.avatarEmoji}</span>
                    <span className="font-semibold text-white text-[11px]">@{rep.username}</span>
                    <span className="text-[9px] text-[#8b949e]">
                      {new Date(rep.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-[#c9d1d9] pl-5 leading-relaxed">
                    {rep.text}
                  </p>
                </div>
              ))
            )}
            <div ref={threadEndRef} />
          </div>

          {/* Thread input form */}
          <form onSubmit={sendThreadReply} className="p-3 border-t border-[#30363d] bg-[#0d1117]">
            <div className="flex items-center bg-[#161b22] border border-[#30363d] focus-within:border-[#58a6ff] rounded-lg px-2 py-1.5 gap-2">
              <input
                type="text"
                value={threadText}
                onChange={(e) => setThreadText(e.target.value)}
                placeholder="Reply to thread..."
                className="flex-1 bg-transparent border-none outline-none text-xs text-[#c9d1d9] focus:ring-0"
              />
              <button
                type="submit"
                disabled={!threadText.trim()}
                className="text-blue-400 hover:text-blue-300 disabled:opacity-50"
              >
                <Send size={12} />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* B. Code Snippet Upload Modal */}
      {isSnippetModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-[#21262d] px-4 py-3 border-b border-[#30363d] flex items-center justify-between">
              <span className="text-xs font-mono text-[#8b949e]">codebase_snapshot_uploader.py</span>
              <button 
                onClick={() => setIsSnippetModalOpen(false)}
                className="text-gray-500 hover:text-white cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleSendSnippet} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-[#8b949e] mb-1">SNIPPET TITLE / FILENAME</label>
                <input
                  type="text"
                  required
                  placeholder="App.tsx or server.ts or index.css..."
                  value={snippetTitle}
                  onChange={(e) => setSnippetTitle(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-[#58a6ff] font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono text-[#8b949e] mb-1">LANGUAGE</label>
                  <select
                    value={snippetLang}
                    onChange={(e) => setSnippetLang(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-[#58a6ff] font-mono"
                  >
                    {LANGUAGES.map(lang => (
                      <option key={lang} value={lang}>{lang.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#8b949e] mb-1">RAW CODE</label>
                <textarea
                  required
                  rows={8}
                  placeholder={`export default function MyComponent() {\n  return <div>Build details</div>\n}`}
                  value={snippetCode}
                  onChange={(e) => setSnippetCode(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-md p-3 text-xs text-white focus:outline-none focus:border-[#58a6ff] font-mono whitespace-pre-wrap"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
              >
                <Code size={13} />
                Share Snippet Workspace
              </button>
            </form>
          </div>
        </div>
      )}

      {/* C. Create Channel Modal */}
      {isCreateChannelOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-[#21262d] px-4 py-3 border-b border-[#30363d] flex items-center justify-between">
              <span className="text-xs font-mono text-[#8b949e]">create_channel_wizard.sh</span>
              <button 
                onClick={() => setIsCreateChannelOpen(false)}
                className="text-gray-500 hover:text-white cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleCreateChannel} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-[#8b949e] mb-1">CHANNEL NAME</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-gray-500 font-mono">#</span>
                  <input
                    type="text"
                    required
                    placeholder="react-19-hooks"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-md pl-6 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#58a6ff] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#8b949e] mb-1">DESCRIPTION</label>
                <textarea
                  rows={3}
                  placeholder="What should developers discuss here?"
                  value={newChannelDesc}
                  onChange={(e) => setNewChannelDesc(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-md p-3 text-xs text-white focus:outline-none focus:border-[#58a6ff]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#8b949e] mb-1">CLASSIFICATION</label>
                <select
                  value={newChannelCat}
                  onChange={(e) => setNewChannelCat(e.target.value as any)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-[#58a6ff] font-mono"
                >
                  <option value="Channels">Channels</option>
                  <option value="Guilds">Guilds / Specialist Spaces</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={13} />
                Create Network Space
              </button>
            </form>
          </div>
        </div>
      )}

      {/* E. Create Community Modal */}
      {isCreateCommunityOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-[#21262d] px-4 py-3 border-b border-[#30363d] flex items-center justify-between">
              <span className="text-xs font-mono text-purple-400">create_guild_wizard.sh</span>
              <button 
                onClick={() => setIsCreateCommunityOpen(false)}
                className="text-gray-500 hover:text-white cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleCreateCommunity} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-[#8b949e] mb-1">GUILD / SPACE NAME</label>
                <input
                  type="text"
                  required
                  placeholder="Rust Core Contributors"
                  value={newCommunityName}
                  onChange={(e) => setNewCommunityName(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#8b949e] mb-1">DESCRIPTION</label>
                <textarea
                  rows={3}
                  placeholder="Systems-level research, async architectures, and microcode compilation..."
                  value={newCommunityDesc}
                  onChange={(e) => setNewCommunityDesc(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-md p-3 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus size={13} />
                Establish Developer Guild
              </button>
            </form>
          </div>
        </div>
      )}

      {/* F. Create Event Modal */}
      {isCreateEventOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="bg-[#21262d] px-4 py-3 border-b border-[#30363d] flex items-center justify-between">
              <span className="text-xs font-mono text-amber-400">schedule_event_block.sh</span>
              <button 
                onClick={() => setIsCreateEventOpen(false)}
                className="text-gray-500 hover:text-white cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-[#8b949e] mb-1">EVENT TITLE</label>
                <input
                  type="text"
                  required
                  placeholder="K8s Production Auto-Scaling"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#8b949e] mb-1">DESCRIPTION</label>
                <textarea
                  rows={3}
                  placeholder="Deep dive on configuring auto-scaling thresholds, handling spikes, and designing resilient replicas..."
                  value={newEventDesc}
                  onChange={(e) => setNewEventDesc(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-md p-3 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-[#8b949e] mb-1">DATE & TIME</label>
                  <input
                    type="text"
                    required
                    placeholder="Next Monday, 4:00 PM"
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#8b949e] mb-1">SELECT GUILD</label>
                  <select
                    value={newEventCommunityId}
                    onChange={(e) => setNewEventCommunityId(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  >
                    {communities.map(comm => (
                      <option key={comm.id} value={comm.id}>{comm.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[#8b949e] mb-1">VIRTUAL MEET LINK</label>
                <input
                  type="url"
                  placeholder="https://meet.google.com/xxx-yyyy-zzz"
                  value={newEventMeetLink}
                  onChange={(e) => setNewEventMeetLink(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-xs py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus size={13} />
                Deploy Schedule block
              </button>
            </form>
          </div>
        </div>
      )}

      {/* D. Selected User Details Overlay / Drawer */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xs bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 relative">
            
            {/* Header / close button */}
            <div className="absolute top-3 right-3">
              <button 
                onClick={() => setSelectedUser(null)}
                className="text-gray-500 hover:text-white transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {/* Profile Content */}
            <div className="p-6 text-center">
              <span className="text-5xl block mb-3 animate-bounce">{selectedUser.avatarEmoji}</span>
              <h3 className="text-lg font-bold text-white mb-0.5">@{selectedUser.username}</h3>
              <p className="text-xs text-[#8b949e] mb-4">{selectedUser.role}</p>

              {/* Badges streak/xp */}
              <div className="grid grid-cols-2 gap-2 mb-6">
                <div className="bg-[#0d1117] border border-[#30363d] rounded p-2 text-center">
                  <div className="flex items-center justify-center gap-1 text-orange-400 text-xs font-bold">
                    <Flame size={12} />
                    <span>{selectedUser.streakCount || 5} days</span>
                  </div>
                  <span className="text-[10px] text-gray-500 block mt-0.5 uppercase tracking-wider font-mono">Streak</span>
                </div>

                <div className="bg-[#0d1117] border border-[#30363d] rounded p-2 text-center">
                  <div className="flex items-center justify-center gap-1 text-yellow-400 text-xs font-bold">
                    <Zap size={12} />
                    <span>{selectedUser.xpPoints || 145} pts</span>
                  </div>
                  <span className="text-[10px] text-gray-500 block mt-0.5 uppercase tracking-wider font-mono">XP Rating</span>
                </div>
              </div>

              {/* Listed Skills */}
              <div className="text-left">
                <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-2">Primary Core Stack</p>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedUser.skills && selectedUser.skills.length > 0 ? selectedUser.skills : ['TS', 'React', 'Node', 'System Design']).map((skill, idx) => (
                    <span 
                      key={idx}
                      className="text-[10px] font-mono bg-blue-900/10 text-blue-400 border border-blue-500/10 px-2 py-0.5 rounded"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* COMMAND PALETTE OVERLAY */}
      {isCommandPaletteOpen && (
        <div className="fixed inset-0 bg-[#07080a]/80 backdrop-blur-md flex items-start justify-center pt-[15vh] z-[9999] select-none animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Search Box */}
            <div className="p-4 border-b border-[#30363d] flex items-center gap-3">
              <span className="text-cyan-400 font-mono text-sm">⌘</span>
              <input
                type="text"
                value={commandPaletteSearch}
                onChange={(e) => setCommandPaletteSearch(e.target.value)}
                placeholder="Search actions, files, or press ESC to exit..."
                className="bg-transparent text-white placeholder-gray-500 text-sm focus:outline-none w-full font-mono"
                autoFocus
              />
              <button 
                onClick={() => setIsCommandPaletteOpen(false)}
                className="text-gray-500 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            
            {/* Actions List */}
            <div className="max-h-80 overflow-y-auto p-2 space-y-1 font-mono text-xs">
              <div className="px-3 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                System Controls
              </div>
              
              <button
                onClick={() => {
                  setIsCommandPaletteOpen(false);
                  setIsSnippetModalOpen(true);
                }}
                className="w-full text-left px-3 py-2 hover:bg-cyan-500/10 hover:text-cyan-300 rounded-lg flex items-center justify-between group transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Code size={13} className="text-gray-400 group-hover:text-cyan-300" />
                  Create Code Snippet
                </span>
                <span className="text-[10px] bg-[#21262d] text-gray-400 px-1.5 py-0.5 rounded">Cmd + C</span>
              </button>

              <button
                onClick={() => {
                  setIsCommandPaletteOpen(false);
                  setIsCreateChannelOpen(true);
                  setNewChannelCat('Channels');
                }}
                className="w-full text-left px-3 py-2 hover:bg-cyan-500/10 hover:text-cyan-300 rounded-lg flex items-center justify-between group transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Plus size={13} className="text-gray-400 group-hover:text-cyan-300" />
                  Establish New Channel Space
                </span>
                <span className="text-[10px] bg-[#21262d] text-gray-400 px-1.5 py-0.5 rounded">Cmd + Shift + N</span>
              </button>

              <button
                onClick={() => {
                  setIsCommandPaletteOpen(false);
                  setIsCreateCommunityOpen(true);
                }}
                className="w-full text-left px-3 py-2 hover:bg-cyan-500/10 hover:text-cyan-300 rounded-lg flex items-center justify-between group transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Users size={13} className="text-gray-400 group-hover:text-cyan-300" />
                  Establish Developer Guild Space
                </span>
                <span className="text-[10px] bg-[#21262d] text-gray-400 px-1.5 py-0.5 rounded">Cmd + G</span>
              </button>

              <button
                onClick={() => {
                  setIsCommandPaletteOpen(false);
                  setIsCreateEventOpen(true);
                }}
                className="w-full text-left px-3 py-2 hover:bg-cyan-500/10 hover:text-cyan-300 rounded-lg flex items-center justify-between group transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Calendar size={13} className="text-gray-400 group-hover:text-cyan-300" />
                  Schedule Technical Event
                </span>
                <span className="text-[10px] bg-[#21262d] text-gray-400 px-1.5 py-0.5 rounded">Cmd + E</span>
              </button>

              <button
                onClick={() => {
                  setIsCommandPaletteOpen(false);
                  openWhiteboard();
                }}
                className="w-full text-left px-3 py-2 hover:bg-cyan-500/10 hover:text-cyan-300 rounded-lg flex items-center justify-between group transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Tv size={13} className="text-gray-400 group-hover:text-cyan-300" />
                  Toggle Architecture Whiteboard
                </span>
                <span className="text-[10px] bg-[#21262d] text-gray-400 px-1.5 py-0.5 rounded">Cmd + W</span>
              </button>

              <button
                onClick={() => {
                  setIsCommandPaletteOpen(false);
                  openTerminal();
                }}
                className="w-full text-left px-3 py-2 hover:bg-cyan-500/10 hover:text-cyan-300 rounded-lg flex items-center justify-between group transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Settings size={13} className="text-gray-400 group-hover:text-cyan-300" />
                  Toggle Interactive Terminal Sandbox
                </span>
                <span className="text-[10px] bg-[#21262d] text-gray-400 px-1.5 py-0.5 rounded">Ctrl + `</span>
              </button>

              <div className="h-[1px] bg-[#30363d] my-2" />

              <div className="px-3 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Active Discussions ({channels.length})
              </div>
              
              {channels.map(chan => (
                <button
                  key={chan.id}
                  onClick={() => {
                    selectChannel(chan.id);
                    setIsCommandPaletteOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-800 rounded-md flex items-center gap-2 text-gray-300 hover:text-white"
                >
                  <Hash size={11} className="text-gray-500" />
                  <span>#{chan.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
