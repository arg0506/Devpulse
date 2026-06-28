import React, { useState, useEffect } from 'react';
import { socket } from './socket';
import { DevUser } from './types';
import ProfileSelector from './components/ProfileSelector';
import ChatWorkspace from './components/ChatWorkspace';
import Whiteboard from './components/Whiteboard';
import Terminal from './components/Terminal';
import { 
  Terminal as TermIcon, 
  GitBranch, 
  Wifi, 
  WifiOff, 
  AlertCircle,
  Code2,
  FolderTree,
  Edit2,
  Award
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<DevUser | null>(() => {
    const saved = localStorage.getItem('devpulse_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState<boolean>(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState<boolean>(true); // default open to show commands!

  useEffect(() => {
    if (!currentUser) return;

    // Connect socket on profile validation
    socket.connect();

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('user:init', currentUser);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // In case connection is already active
    if (socket.connected) {
      setIsConnected(true);
      socket.emit('user:init', currentUser);
    }

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.disconnect();
    };
  }, [currentUser]);

  // Handle key listeners (e.g. Ctrl + ` to toggle terminal)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '`') {
        setIsTerminalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleProfileSelect = (user: DevUser) => {
    localStorage.setItem('devpulse_user', JSON.stringify(user));
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('devpulse_user');
    socket.disconnect();
    setCurrentUser(null);
    setIsWhiteboardOpen(false);
  };

  if (!currentUser) {
    return <ProfileSelector onSelect={handleProfileSelect} />;
  }

  return (
    <div className="h-screen bg-[#07090e] text-[#e1e4ea] flex flex-col overflow-hidden font-sans select-none relative">
      {/* Background radial atmosphere */}
      <div className="absolute w-[600px] h-[600px] bg-cyan-500/[0.03] rounded-full blur-[140px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

      {/* Dynamic Alert Banner if disconnected */}
      {!isConnected && (
        <div className="bg-red-950/50 border-b border-red-500/30 px-4 py-2 flex items-center justify-center gap-2 text-xs text-red-400 font-semibold tracking-wider uppercase backdrop-blur-md animate-pulse z-50">
          <AlertCircle size={14} className="animate-bounce" />
          <span>Uplink Terminated. Reconnecting socket clusters...</span>
        </div>
      )}

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden z-10">
        
        {/* DESIGNER RAIL (Left side micro strip) */}
        <div className="w-16 bg-[#090b10] border-r border-[#1a2333] flex flex-col items-center py-5 justify-between flex-shrink-0">
          <div className="flex flex-col gap-5 items-center w-full">
            {/* Logo Accent */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center text-white font-extrabold text-sm shadow-[0_0_15px_rgba(6,182,212,0.3)] mb-4">
              DP
            </div>

            <button 
              onClick={() => setIsWhiteboardOpen(false)}
              className={`p-3 rounded-xl transition-all duration-300 cursor-pointer relative group ${
                !isWhiteboardOpen 
                  ? 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
                  : 'text-gray-500 hover:text-white hover:bg-white/[0.02]'
              }`}
              title="Chat channels"
            >
              <FolderTree size={18} />
              {!isWhiteboardOpen && <span className="absolute left-0 top-1/3 w-1 h-1/3 bg-cyan-400 rounded-r-md" />}
            </button>
            <button 
              onClick={() => setIsWhiteboardOpen(true)}
              className={`p-3 rounded-xl transition-all duration-300 cursor-pointer relative group ${
                isWhiteboardOpen 
                  ? 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
                  : 'text-gray-500 hover:text-white hover:bg-white/[0.02]'
              }`}
              title="Collaborative Sketchbook"
            >
              <Edit2 size={18} />
              {isWhiteboardOpen && <span className="absolute left-0 top-1/3 w-1 h-1/3 bg-cyan-400 rounded-r-md" />}
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <button 
              onClick={() => setIsTerminalOpen(prev => !prev)}
              className={`p-3 rounded-xl transition-all duration-300 cursor-pointer ${
                isTerminalOpen 
                  ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                  : 'text-gray-500 hover:text-white hover:bg-white/[0.02]'
              }`}
              title="Toggle Interactive Console"
            >
              <TermIcon size={18} />
            </button>
          </div>
        </div>

        {/* Workspace core canvas (Handles chat workspace OR Whiteboard co-design board) */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0a0d14]">
          <div className="flex-1 flex overflow-hidden relative">
            
            {/* Split / tab toggled display */}
            {!isWhiteboardOpen ? (
              <ChatWorkspace 
                currentUser={currentUser}
                onLogout={handleLogout}
                openWhiteboard={() => setIsWhiteboardOpen(true)}
                isWhiteboardOpen={isWhiteboardOpen}
                openTerminal={() => setIsTerminalOpen(prev => !prev)}
                isTerminalOpen={isTerminalOpen}
              />
            ) : (
              <div className="flex-1 flex flex-col bg-[#0b0d14]">
                {/* Whiteboard Header */}
                <div className="h-16 border-b border-[#1f293d] bg-[#0f121a]/95 px-6 flex items-center justify-between z-10">
                  <div>
                    <h2 className="font-bold text-white text-sm tracking-wide">Co-Design Vector Sketchboard</h2>
                    <p className="text-[11px] text-[#8b9ba8] font-mono mt-0.5">Plot UML diagrams, network microservices, and design modules in real-time.</p>
                  </div>
                  <button
                    onClick={() => setIsWhiteboardOpen(false)}
                    className="text-xs font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-4 py-2 rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.25)] cursor-pointer hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                  >
                    Return to Live Chat
                  </button>
                </div>
                
                {/* Whiteboard board */}
                <Whiteboard currentUser={currentUser} onClose={() => setIsWhiteboardOpen(false)} />
              </div>
            )}

          </div>

          {/* Interactive Console sandbox bottom block */}
          {isTerminalOpen && (
            <Terminal 
              onClose={() => setIsTerminalOpen(false)} 
              userId={currentUser.id}
              username={currentUser.username}
            />
          )}

        </div>

      </div>

      {/* STATUS FOOTER BAR */}
      <div className="h-7 bg-[#0b0c11] border-t border-[#1a2333] text-[#8b9ba8] text-[11px] px-4 flex items-center justify-between font-mono relative z-50 shadow-inner">
        <div className="flex items-center gap-4">
          <span className="bg-cyan-950/50 text-cyan-400 border border-cyan-500/25 px-2.5 py-0.5 rounded-full flex items-center gap-1 text-[10px] font-bold">
            <GitBranch size={11} className="text-cyan-400" />
            <span>main*</span>
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5">
            {isConnected ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>active_telemetry</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-red-400 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                <span>uplink_lost</span>
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-5">
          <span className="hidden md:inline-flex items-center gap-1.5 text-purple-300">
            <Award size={11} className="text-purple-400" />
            <span className="font-bold">{currentUser.xpPoints} XP</span>
          </span>
          <span className="hidden sm:inline border-l border-[#1f293d] pl-4 text-gray-500">UTF-8</span>
          <span className="text-gray-500">TypeScript</span>
          <button 
            onClick={() => setIsTerminalOpen(prev => !prev)}
            className="hover:bg-white/[0.04] px-3 h-full flex items-center gap-1.5 cursor-pointer text-[#e1e4ea] hover:text-cyan-400 transition-colors border-l border-[#1f293d]"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>Interactive terminal</span>
          </button>
        </div>
      </div>

    </div>
  );
}
