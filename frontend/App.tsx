import React, { useState, useEffect } from 'react';
import { socket } from './socket';
import { DevUser } from './types';
import ProfileSelector from './components/ProfileSelector';
import LandingPage from './components/LandingPage';
import ChatWorkspace from './components/ChatWorkspace';
import Whiteboard from './components/Whiteboard';
import AgentWorkflowBuilder from './components/AgentWorkflowBuilder';
import Terminal from './components/Terminal';
import CheckoutModal from './components/CheckoutModal';
import SpaceBackground from './components/SpaceBackground';
import { auth, signOut } from './firebase';
import { 
  Terminal as TermIcon, 
  GitBranch, 
  Wifi, 
  WifiOff, 
  AlertCircle,
  Code2,
  FolderTree,
  Edit2,
  Award,
  Bot
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<DevUser | null>(() => {
    const saved = localStorage.getItem('devpulse_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [showLanding, setShowLanding] = useState<boolean>(true);
  const [pendingPlan, setPendingPlan] = useState<'pro' | 'enterprise' | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);

  // Trigger checkout if user selected a plan from landing page and just logged in/signed up
  useEffect(() => {
    if (currentUser && pendingPlan) {
      if (currentUser.tier !== 'Pro' && currentUser.tier !== 'Enterprise') {
        setIsCheckoutOpen(true);
      }
    }
  }, [currentUser]);

  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'whiteboard' | 'agent-builder'>('chat');

  // Backward compatibility wrapper for existing component bindings
  const isWhiteboardOpen = activeTab === 'whiteboard';
  const setIsWhiteboardOpen = (open: boolean) => {
    setActiveTab(open ? 'whiteboard' : 'chat');
  };
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
    signOut(auth).catch(err => console.error("Sign out error:", err));
    localStorage.removeItem('devpulse_user');
    socket.disconnect();
    setCurrentUser(null);
    setIsWhiteboardOpen(false);
    setShowLanding(true);
  };

  if (!currentUser) {
    if (showLanding) {
      return (
        <LandingPage 
          onLaunch={(plan) => {
            if (plan) setPendingPlan(plan);
            setShowLanding(false);
          }} 
        />
      );
    }
    return (
      <ProfileSelector 
        onSelect={handleProfileSelect} 
        onBackToLanding={() => setShowLanding(true)} 
      />
    );
  }

  return (
    <div className="h-screen bg-[#070514] text-purple-100 flex flex-col overflow-hidden font-sans select-none relative">
      {/* Animated cosmic background overlay */}
      <SpaceBackground />

      {/* Decorative architectural layout grid lines */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(to_right,rgba(124,58,237,0.3)_1px,transparent_1px),linear-gradient(to_bottom,rgba(6,182,212,0.3)_1px,transparent_1px)] bg-[size:40px_40px] z-0" />

      {/* Dynamic Alert Banner if disconnected */}
      {!isConnected && (
        <div className="bg-pink-600 border-b border-purple-500/20 px-4 py-2 flex items-center justify-center gap-2 text-xs text-white font-mono font-bold tracking-wider uppercase animate-pulse z-50">
          <AlertCircle size={14} />
          <span>Uplink offline // Reconnecting socket pipelines...</span>
        </div>
      )}

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden z-10">
        
        {/* DESIGNER RAIL (Left side micro strip) */}
        <div className="w-16 bg-[#110d24]/80 border-r border-purple-500/20 flex flex-col items-center py-6 justify-between flex-shrink-0 z-10 backdrop-blur-xl">
          <div className="flex flex-col gap-6 items-center w-full">
            {/* Logo Accent */}
            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-serif font-black text-sm shadow-[0_0_15px_rgba(236,72,153,0.3)] mb-4 rounded-xl">
              DP
            </div>

            <button 
              onClick={() => setActiveTab('chat')}
              className={`p-3 rounded-xl transition-all duration-200 cursor-pointer relative group border ${
                activeTab === 'chat' 
                  ? 'text-cyan-400 bg-[#161230]/80 border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.25)]' 
                  : 'text-purple-300/60 hover:text-white hover:bg-purple-950/40 border-transparent'
              }`}
              title="Chat channels"
            >
              <FolderTree size={18} />
              {activeTab === 'chat' && <span className="absolute left-0 top-1/3 w-0.5 h-1/3 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.5)]" />}
            </button>
            <button 
              onClick={() => setActiveTab('whiteboard')}
              className={`p-3 rounded-xl transition-all duration-200 cursor-pointer relative group border ${
                activeTab === 'whiteboard' 
                  ? 'text-cyan-400 bg-[#161230]/80 border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.25)]' 
                  : 'text-purple-300/60 hover:text-white hover:bg-purple-950/40 border-transparent'
              }`}
              title="Collaborative Sketchbook"
            >
              <Edit2 size={18} />
              {activeTab === 'whiteboard' && <span className="absolute left-0 top-1/3 w-0.5 h-1/3 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.5)]" />}
            </button>
            <button 
              onClick={() => setActiveTab('agent-builder')}
              className={`p-3 rounded-xl transition-all duration-200 cursor-pointer relative group border ${
                activeTab === 'agent-builder' 
                  ? 'text-cyan-400 bg-[#161230]/80 border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.25)]' 
                  : 'text-purple-300/60 hover:text-white hover:bg-purple-950/40 border-transparent'
              }`}
              title="Autonomous AI Agent Studio (n8n mode)"
            >
              <Bot size={18} />
              {activeTab === 'agent-builder' && <span className="absolute left-0 top-1/3 w-0.5 h-1/3 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.5)]" />}
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <button 
              onClick={() => setIsTerminalOpen(prev => !prev)}
              className={`p-3 rounded-xl transition-all duration-200 cursor-pointer border ${
                isTerminalOpen 
                  ? 'text-pink-400 bg-[#161230]/80 border-pink-500/30 shadow-[0_0_12px_rgba(236,72,153,0.25)]' 
                  : 'text-purple-300/60 hover:text-white hover:bg-[#1b163a]/40 border-transparent'
              }`}
              title="Toggle Interactive Console"
            >
              <TermIcon size={18} />
            </button>
          </div>
        </div>

        {/* Workspace core canvas (Handles chat workspace OR Whiteboard co-design board OR Agent Studio builder) */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-transparent">
          <div className="flex-1 flex overflow-hidden relative">
            
            {/* Split / tab toggled display */}
            {activeTab === 'chat' && (
              <ChatWorkspace 
                currentUser={currentUser}
                onLogout={handleLogout}
                openWhiteboard={() => setActiveTab('whiteboard')}
                isWhiteboardOpen={false}
                openTerminal={() => setIsTerminalOpen(prev => !prev)}
                isTerminalOpen={isTerminalOpen}
                triggerUpgrade={(plan) => {
                  setPendingPlan(plan);
                  setIsCheckoutOpen(true);
                }}
              />
            )}

            {activeTab === 'whiteboard' && (
              <div className="flex-1 flex flex-col bg-[#0f0b21]/80 backdrop-blur-md h-full overflow-hidden">
                {/* Whiteboard Header */}
                <div className="h-16 border-b border-purple-500/20 bg-[#161230]/90 px-6 flex items-center justify-between z-10 flex-shrink-0">
                  <div>
                    <h2 className="font-serif font-extrabold text-white text-base tracking-wide">Co-Design Vector Sketchboard</h2>
                    <p className="text-[11px] text-purple-300/60 font-mono mt-0.5">Plot UML diagrams, network layouts, and design components in real-time.</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('chat')}
                    className="text-xs font-mono font-bold bg-cyan-500 hover:bg-cyan-400 text-black px-4 py-2 transition-all border border-cyan-400/30 rounded-xl shadow-[0_0_12px_rgba(6,182,212,0.25)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  >
                    Return to Live Chat
                  </button>
                </div>
                
                {/* Whiteboard board */}
                <Whiteboard currentUser={currentUser} onClose={() => setActiveTab('chat')} />
              </div>
            )}

            {activeTab === 'agent-builder' && (
              <div className="flex-1 flex flex-col bg-[#0f0b21]/80 backdrop-blur-md h-full overflow-hidden">
                {/* Agent Builder Header */}
                <div className="h-16 border-b border-purple-500/20 bg-[#161230]/90 px-6 flex items-center justify-between z-10 flex-shrink-0">
                  <div>
                    <h2 className="font-serif font-extrabold text-white text-base tracking-wide">Autonomous AI Agent Studio</h2>
                    <p className="text-[11px] text-purple-300/60 font-mono mt-0.5 font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-300">Design webhook-triggers, Google Search nodes, sandboxed JS executors, and Gemini dispatches.</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('chat')}
                    className="text-xs font-mono font-bold bg-cyan-500 hover:bg-cyan-400 text-black px-4 py-2 transition-all border border-cyan-400/30 rounded-xl shadow-[0_0_12px_rgba(6,182,212,0.25)] hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  >
                    Return to Live Chat
                  </button>
                </div>
                
                {/* Agent Builder board */}
                <AgentWorkflowBuilder currentUser={currentUser} />
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
      <div className="h-8 bg-[#110d24]/90 border-t border-purple-500/20 text-purple-300/80 text-xs px-5 flex items-center justify-between font-mono relative z-50 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <span className="bg-purple-950/80 text-cyan-400 border border-purple-500/20 px-2.5 py-0.5 rounded-md flex items-center gap-1.5 text-[10px] font-bold">
            <GitBranch size={11} className="text-cyan-400" />
            <span>main*</span>
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5">
            {isConnected ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>active_telemetry</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-pink-400 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                <span>uplink_lost</span>
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-5">
          <span className="hidden md:inline-flex items-center gap-1.5 text-cyan-400 font-bold">
            <Award size={12} className="text-cyan-400 drop-shadow-[0_0_4px_rgba(6,182,212,0.4)]" />
            <span>{currentUser.xpPoints} XP</span>
          </span>
          <span className="hidden sm:inline border-l border-purple-500/20 pl-4 text-purple-300/30">UTF-8</span>
          <span className="text-purple-300/30">TypeScript</span>
          <button 
            onClick={() => setIsTerminalOpen(prev => !prev)}
            className="hover:bg-purple-950/40 px-3 h-full flex items-center gap-1.5 cursor-pointer text-purple-300 hover:text-cyan-400 transition-all border-l border-purple-500/20"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse" />
            <span className="font-bold">terminal console</span>
          </button>
        </div>
      </div>

      {isCheckoutOpen && currentUser && (
        <CheckoutModal 
          currentUser={currentUser}
          selectedPlan={pendingPlan || 'pro'}
          onClose={() => {
            setIsCheckoutOpen(false);
            setPendingPlan(null);
          }}
          onUpgradeSuccess={(upgradedUser) => {
            handleProfileSelect(upgradedUser);
            setIsCheckoutOpen(false);
            setPendingPlan(null);
          }}
        />
      )}
    </div>
  );
}
