import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal as TermIcon, 
  Code2, 
  GitBranch, 
  Shield, 
  Award, 
  FolderTree, 
  Edit2, 
  Check, 
  Zap, 
  Sparkles, 
  Globe, 
  Activity, 
  Cpu, 
  Layers, 
  Lock, 
  ChevronDown, 
  ChevronUp, 
  Play, 
  ArrowRight,
  Github,
  Twitter,
  ExternalLink,
  Plus,
  Mail,
  RefreshCw
} from 'lucide-react';

interface LandingPageProps {
  onLaunch: (plan?: 'pro' | 'enterprise') => void;
}

export default function LandingPage({ onLaunch }: LandingPageProps) {
  // Navigation states
  const [activeTab, setActiveTab] = useState<string>('hero');
  const [pricingPeriod, setPricingPeriod] = useState<'monthly' | 'yearly'>('yearly');
  
  // Interactive Terminal Sandbox states
  const [terminalInput, setTerminalInput] = useState<string>('');
  const [terminalHistory, setTerminalHistory] = useState<Array<{ text: string; type: 'input' | 'output' | 'success' | 'error' | 'cyber' }>>([
    { text: 'DevPulse Sandbox Interactive Environment [v2.4.1-alpha]', type: 'output' },
    { text: 'Establishing local socket pipelines... Connected.', type: 'success' },
    { text: 'Type "help" or select a preset macro button to initialize commands.', type: 'output' }
  ]);
  const [isHacking, setIsHacking] = useState<boolean>(false);
  const terminalBottomRef = useRef<HTMLDivElement | null>(null);

  // FAQ Accordion states
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Newsletter state
  const [newsletterEmail, setNewsletterEmail] = useState<string>('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState<boolean>(false);

  // Stats Counters (Simulated ticking)
  const [metrics, setMetrics] = useState({
    activeNodes: 4892,
    packetsSynthesized: 142400,
    uptime: 99.997,
    combinedXp: 14205800
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        activeNodes: prev.activeNodes + (Math.random() > 0.7 ? (Math.random() > 0.5 ? 1 : -1) : 0),
        packetsSynthesized: prev.packetsSynthesized + Math.floor(Math.random() * 45 + 15),
        uptime: Math.min(99.999, Math.max(99.991, prev.uptime + (Math.random() > 0.9 ? (Math.random() > 0.5 ? 0.001 : -0.001) : 0))),
        combinedXp: prev.combinedXp + Math.floor(Math.random() * 8 + 1)
      }));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // Scroll to section helper
  const scrollToSection = (id: string) => {
    setActiveTab(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Auto scroll terminal history
  useEffect(() => {
    if (terminalBottomRef.current) {
      terminalBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalHistory, isHacking]);

  // Terminal command executor
  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = terminalInput.trim().toLowerCase();
    if (!cmd) return;

    const newHistory = [...terminalHistory, { text: `devpulse@guest:~$ ${terminalInput}`, type: 'input' as const }];
    setTerminalInput('');

    switch(cmd) {
      case 'help':
        newHistory.push(
          { text: 'Available commands:', type: 'output' },
          { text: '  features   - Details our decentralized workspace architectural suite', type: 'output' },
          { text: '  specs      - Displays the raw stack technical configuration variables', type: 'output' },
          { text: '  profile    - Explains cryptographic credentials onboarding system', type: 'output' },
          { text: '  hack       - Launches a real-time cybernetic sandbox compilation sequence', type: 'output' },
          { text: '  clear      - Resets terminal output history', type: 'output' }
        );
        break;
      case 'clear':
        setTerminalHistory([
          { text: 'DevPulse Sandbox Interactive Environment [v2.4.1-alpha]', type: 'output' }
        ]);
        return;
      case 'features':
        newHistory.push(
          { text: '--- DEVPULSE INTEGRATED WORKSPACE CAPABILITIES ---', type: 'output' },
          { text: '[🟢 CHAT]   Real-time multi-channel communication (Socket.io protocol)', type: 'success' },
          { text: '[🔵 BOARD]  Infinite-canvas vector drawing stage (custom responsive viewports)', type: 'success' },
          { text: '[🟡 PROFILE] Decentralized Firebase profiles mapping handles, XP, streaks & credentials', type: 'success' },
          { text: '[🟣 CLI]     Simulated fully functional command-line playground sandbox', type: 'success' }
        );
        break;
      case 'specs':
        newHistory.push(
          { text: 'HOSTING_INGRESS_URL: https://devpulse.io/sandbox', type: 'output' },
          { text: 'PRIMARY_PORT_ROUTING: 3000 (secured proxy tunnels enabled)', type: 'output' },
          { text: 'PERSISTENCE_DB: Cloud Firestore "ai-studio-devpulse-b9823a0f"', type: 'output' },
          { text: 'AUTH_GATEWAY: Google OAuth Node Identity Cluster / AES-256', type: 'output' },
          { text: 'AI_COPILOT_CORE: Gemini Pro Server-Side SDK Pipeline Activated', type: 'success' }
        );
        break;
      case 'profile':
        newHistory.push(
          { text: 'PROFILES STATUS: Decentrally configured on secure cloud structures.', type: 'output' },
          { text: 'Every logged-in member establishes an individual node, keeping track of daily coding streaks, and gaining global XP points in real-time collaboration milestones.', type: 'output' },
          { text: 'Try launching the actual app above to provision your secure node profile!', type: 'success' }
        );
        break;
      case 'hack':
        setIsHacking(true);
        setTerminalHistory(newHistory);
        executeHackSeq();
        return;
      default:
        newHistory.push({ text: `Unknown terminal operation: "${cmd}". Type "help" for a list of diagnostics.`, type: 'error' });
    }

    setTerminalHistory(newHistory);
  };

  // Cyber hack animation macro script
  const executeHackSeq = () => {
    const hackSteps = [
      { text: 'INITIATING RECURSIVE DECRYPT SEQUENCE...', type: 'cyber' as const },
      { text: 'Connecting to server nodes at 0.0.0.0:3000...', type: 'cyber' as const },
      { text: 'Uplinking websocket frames on port 3000...', type: 'cyber' as const },
      { text: 'Querying Firestore: users/* COLLECTION SCHEMAS...', type: 'cyber' as const },
      { text: 'Decrypting cryptographic profile keys...', type: 'cyber' as const },
      { text: 'Injecting custom CSS / tailwind structures...', type: 'cyber' as const },
      { text: 'DECRYPT SUCCESSFUL! ALL FIREWALL TUNNELS ESTABLISHED [200 OK]', type: 'success' as const }
    ];

    let delay = 300;
    hackSteps.forEach((step, idx) => {
      setTimeout(() => {
        setTerminalHistory(prev => [...prev, step]);
        if (idx === hackSteps.length - 1) {
          setIsHacking(false);
        }
      }, delay);
      delay += Math.floor(Math.random() * 400 + 200);
    });
  };

  const runMacroCommand = (cmd: string) => {
    if (isHacking) return;
    setTerminalInput(cmd);
    // Simulate slight delay then submit
    setTimeout(() => {
      const mockEvent = { preventDefault: () => {} } as React.FormEvent;
      // We manually evaluate it for simpler hooks
      setTerminalInput(cmd);
      const newHistory = [...terminalHistory, { text: `devpulse@guest:~$ ${cmd}`, type: 'input' as const }];
      
      if (cmd === 'hack') {
        setIsHacking(true);
        setTerminalHistory([...newHistory, { text: 'INITIATING RECURSIVE DECRYPT SEQUENCE...', type: 'cyber' }]);
        executeHackSeq();
      } else if (cmd === 'features') {
        setTerminalHistory([...newHistory, 
          { text: '--- DEVPULSE INTEGRATED WORKSPACE CAPABILITIES ---', type: 'output' },
          { text: '[🟢 CHAT]   Real-time multi-channel communication (Socket.io protocol)', type: 'success' },
          { text: '[🔵 BOARD]  Infinite-canvas vector drawing stage (custom responsive viewports)', type: 'success' },
          { text: '[🟡 PROFILE] Decentralized Firebase profiles mapping handles, XP, streaks & credentials', type: 'success' },
          { text: '[🟣 CLI]     Simulated fully functional command-line playground sandbox', type: 'success' }
        ]);
      } else if (cmd === 'specs') {
        setTerminalHistory([...newHistory, 
          { text: 'HOSTING_INGRESS_URL: https://devpulse.io/sandbox', type: 'output' },
          { text: 'PRIMARY_PORT_ROUTING: 3000 (secured proxy tunnels enabled)', type: 'output' },
          { text: 'PERSISTENCE_DB: Cloud Firestore "ai-studio-devpulse-b9823a0f"', type: 'output' },
          { text: 'AUTH_GATEWAY: Google OAuth Node Identity Cluster / AES-256', type: 'output' },
          { text: 'AI_COPILOT_CORE: Gemini Pro Server-Side SDK Pipeline Activated', type: 'success' }
        ]);
      } else if (cmd === 'profile') {
        setTerminalHistory([...newHistory, 
          { text: 'PROFILES STATUS: Decentrally configured on secure cloud structures.', type: 'output' },
          { text: 'Every logged-in member establishes an individual node, keeping track of daily coding streaks, and gaining global XP points in real-time collaboration milestones.', type: 'output' },
          { text: 'Try launching the actual app above to provision your secure node profile!', type: 'success' }
        ]);
      }
      setTerminalInput('');
    }, 100);
  };

  // Expandable FAQ Content array
  const faqData = [
    {
      q: "What exactly is DevPulse?",
      a: "DevPulse is an integrated sandbox environment built specifically for elite engineering teams. It brings together instant websocket communications, persistent Firebase Firestore databases, collaborative sketching canvas stages, and fully-functional backend proxy execution streams in a single unified platform."
    },
    {
      q: "Are the user profiles and code histories secure?",
      a: "Yes, absolutely. We use enterprise-grade Firebase authentication layers alongside client-side secure hashes. All workspace records and customized developer profiles are preserved safely inside a dedicated, isolated Firestore database node."
    },
    {
      q: "How does the real-time drawing whiteboard function?",
      a: "The whiteboard is a highly-tuned vector drawing stage that uses HTML5 canvases coupled with socket update streams. This enables multi-device instant synchronization so your developers can plan, diagram, and wireframe architectural features together in real-time."
    },
    {
      q: "Does DevPulse support full relational database operations?",
      a: "Yes! While we default to flexible, serverless Cloud Firestore for instant profiles and logs, the backend contains modular bridges supporting full Prisma Client integrations with secure Postgres relational databases."
    },
    {
      q: "Is there any charge for establishing custom sovereign profiles?",
      a: "Our Core Sovereign tier is 100% free forever for individual developers. You get full access to the group communications, custom status configurations, developer XP tracking, and standard terminal sandboxes. Premium squad drawing canvases are covered in the Pro Cluster tier."
    }
  ];

  return (
    <div className="min-h-screen text-gray-100 font-sans relative overflow-x-hidden bg-[#070514]">
      {/* Cyber Grid Lines overlay for modern structure */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.06] bg-[linear-gradient(to_right,rgba(6,182,212,0.4)_1px,transparent_1px),linear-gradient(to_bottom,rgba(124,58,237,0.4)_1px,transparent_1px)] bg-[size:40px_40px] z-0" />

      {/* Modern Fixed Navbar */}
      <nav className="fixed top-0 left-0 right-0 h-16 border-b border-purple-500/10 bg-[#070514]/80 backdrop-blur-md z-50 transition-all">
        <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)] border border-cyan-400/20">
              <Code2 className="text-white" size={18} />
            </div>
            <span className="font-serif font-extrabold text-lg tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-100 to-cyan-200">
              DevPulse
            </span>
            <span className="text-[9px] font-mono font-bold bg-purple-950/60 border border-purple-500/30 text-cyan-400 px-1.5 py-0.5 rounded-md uppercase">
              v2.4
            </span>
          </div>

          {/* Nav Links Desktop */}
          <div className="hidden md:flex items-center gap-7">
            <button 
              onClick={() => scrollToSection('features')} 
              className={`text-xs font-mono tracking-wider uppercase transition-colors cursor-pointer ${activeTab === 'features' ? 'text-cyan-400 font-bold' : 'text-purple-200/70 hover:text-white'}`}
            >
              Capabilities
            </button>
            <button 
              onClick={() => scrollToSection('demo')} 
              className={`text-xs font-mono tracking-wider uppercase transition-colors cursor-pointer ${activeTab === 'demo' ? 'text-cyan-400 font-bold' : 'text-purple-200/70 hover:text-white'}`}
            >
              Live CLI
            </button>
            <button 
              onClick={() => scrollToSection('architecture')} 
              className={`text-xs font-mono tracking-wider uppercase transition-colors cursor-pointer ${activeTab === 'architecture' ? 'text-cyan-400 font-bold' : 'text-purple-200/70 hover:text-white'}`}
            >
              Architecture
            </button>
            <button 
              onClick={() => scrollToSection('pricing')} 
              className={`text-xs font-mono tracking-wider uppercase transition-colors cursor-pointer ${activeTab === 'pricing' ? 'text-cyan-400 font-bold' : 'text-purple-200/70 hover:text-white'}`}
            >
              Pricing
            </button>
            <button 
              onClick={() => scrollToSection('faq')} 
              className={`text-xs font-mono tracking-wider uppercase transition-colors cursor-pointer ${activeTab === 'faq' ? 'text-cyan-400 font-bold' : 'text-purple-200/70 hover:text-white'}`}
            >
              FAQ
            </button>
          </div>

          {/* Launch Button */}
          <button 
            onClick={onLaunch}
            className="group relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-xs font-mono tracking-wider font-bold uppercase rounded-xl group bg-gradient-to-br from-cyan-400 via-indigo-500 to-purple-600 group-hover:from-cyan-400 group-hover:to-purple-600 text-white focus:ring-2 focus:outline-none focus:ring-cyan-800 cursor-pointer shadow-[0_0_20px_rgba(124,58,237,0.25)] transition-all hover:scale-[1.03] mt-2"
          >
            <span className="relative px-4 py-2 transition-all ease-in duration-75 bg-[#0b081d] rounded-xl group-hover:bg-opacity-0 flex items-center gap-1.5">
              Launch Platform
              <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
            </span>
          </button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <header id="hero" className="relative min-h-screen pt-32 pb-20 px-6 flex flex-col justify-center items-center z-10">
        
        {/* Subtle mesh elements */}
        <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[70vw] h-[40vh] bg-gradient-to-b from-purple-600/10 to-transparent blur-[120px] pointer-events-none rounded-full" />
        
        <div className="max-w-4xl text-center space-y-6">
          
          {/* Animated Tech Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-purple-950/40 border border-purple-500/30 rounded-full shadow-[0_0_15px_rgba(124,58,237,0.1)] animate-bounce">
            <Sparkles size={11} className="text-cyan-400" />
            <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase">
              DECENTRALIZED WORKSPACE CO-LAB // THE FUTURE IS STABLE
            </span>
          </div>

          {/* Master Headline */}
          <h1 className="text-4xl sm:text-6xl font-serif font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-100 to-cyan-100 leading-tight tracking-tight max-w-3xl mx-auto">
            The Decoupled Collaboration Core for <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">Sovereign Engineers</span>
          </h1>

          {/* Short elegant paragraph */}
          <p className="text-sm sm:text-base text-purple-200/70 max-w-2xl mx-auto leading-relaxed">
            Synthesize code, manage cryptographic developer nodes, align whiteboards on vector stages, and deploy private communication sandboxes instantly. Fully integrated with secure Firebase persistence.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button 
              onClick={onLaunch}
              className="w-full sm:w-auto bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:via-indigo-500 hover:to-cyan-400 text-white font-mono font-bold text-xs tracking-widest uppercase py-4 px-8 rounded-xl transition-all duration-300 flex items-center justify-center gap-2.5 shadow-[0_0_30px_rgba(124,58,237,0.4)] border border-purple-400/30 hover:scale-[1.02] cursor-pointer"
            >
              <Zap size={14} />
              Launch Active Workspace
            </button>
            <button 
              onClick={() => scrollToSection('demo')}
              className="w-full sm:w-auto bg-[#130f2c]/75 hover:bg-[#1a153b] border border-purple-500/30 text-purple-200 hover:text-white font-mono font-bold text-xs tracking-widest uppercase py-4 px-8 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer hover:border-cyan-400"
            >
              <TermIcon size={14} className="text-cyan-400 animate-pulse" />
              Try Interactive CLI Demo
            </button>
          </div>

          {/* Realtime Live Telemetry strip */}
          <div className="pt-16 max-w-3xl mx-auto">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 p-6 bg-[#0f0b26]/70 border border-purple-500/25 backdrop-blur-md rounded-2xl shadow-[0_0_20px_rgba(124,58,237,0.05)]">
              
              <div className="text-center space-y-1">
                <p className="text-xs font-mono text-purple-300/50 uppercase tracking-wider">Active Uplink Nodes</p>
                <p className="text-xl font-mono font-extrabold text-cyan-400">
                  {metrics.activeNodes.toLocaleString()}
                </p>
              </div>

              <div className="text-center space-y-1 border-l border-purple-500/10">
                <p className="text-xs font-mono text-purple-300/50 uppercase tracking-wider">Synthesized Packets</p>
                <p className="text-xl font-mono font-extrabold text-purple-300">
                  {metrics.packetsSynthesized.toLocaleString()}
                </p>
              </div>

              <div className="text-center space-y-1 border-l border-purple-500/10">
                <p className="text-xs font-mono text-purple-300/50 uppercase tracking-wider">Network Uptime</p>
                <p className="text-xl font-mono font-extrabold text-pink-400">
                  {metrics.uptime.toFixed(3)}%
                </p>
              </div>

              <div className="text-center space-y-1 border-l border-purple-500/10">
                <p className="text-xs font-mono text-purple-300/50 uppercase tracking-wider">Global Dev XP</p>
                <p className="text-xl font-mono font-extrabold text-green-400">
                  {(metrics.combinedXp / 1000000).toFixed(2)}M
                </p>
              </div>

            </div>
          </div>

        </div>

        {/* Shifting visual cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 cursor-pointer" onClick={() => scrollToSection('features')}>
          <span className="text-[10px] font-mono tracking-widest text-purple-400/50 uppercase">Discover Capabilities</span>
          <ChevronDown size={14} className="text-cyan-400 animate-bounce" />
        </div>
      </header>


      {/* CAPABILITIES SECTION (Bento Feature Grid) */}
      <section id="features" className="py-24 px-6 relative z-10 max-w-7xl mx-auto">
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-950/40 border border-cyan-500/30 rounded-full text-xs text-cyan-400 font-mono tracking-widest uppercase">
            <Layers size={11} className="animate-spin" style={{ animationDuration: '6s' }} />
            Integrated Ecosystem
          </div>
          <h2 className="text-3xl sm:text-4xl font-serif font-extrabold text-white tracking-tight">
            Designed for Speed. Engineered for Alignment.
          </h2>
          <p className="text-xs sm:text-sm text-purple-200/60 max-w-xl mx-auto">
            Forget switching between multiple development tabs. DevPulse integrates code pipelines, design layers, profiles, and logs in one single low-latency viewport.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Collaborative Communication (WebSockets) */}
          <div className="md:col-span-2 p-8 bg-[#100c28]/80 border border-purple-500/20 backdrop-blur-sm rounded-2xl flex flex-col justify-between hover:border-purple-500/40 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-purple-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />
            <div className="space-y-4 max-w-xl">
              <div className="p-3 bg-purple-950/40 border border-purple-500/30 rounded-xl inline-block text-purple-400 shadow-[0_0_12px_rgba(124,58,237,0.15)]">
                <Globe size={20} className="group-hover:rotate-12 transition-transform" />
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-cyan-300 transition-colors">Real-time Multi-Channel Uplink</h3>
              <p className="text-xs text-purple-200/65 leading-relaxed">
                Connect and communicate instantaneously across decentralized channels. Powered by WebSocket pipes, sending and receiving code snippets and system messages synchronously across all active workspaces.
              </p>
            </div>
            <div className="mt-8 flex items-center gap-3 border-t border-purple-500/10 pt-4 text-[10px] font-mono tracking-widest text-cyan-400 uppercase">
              <span>Socket.io Engine</span>
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
              <span>Full History Synced</span>
            </div>
          </div>

          {/* Card 2: Custom Cryptographic Profiles */}
          <div className="p-8 bg-[#100c28]/80 border border-purple-500/20 backdrop-blur-sm rounded-2xl flex flex-col justify-between hover:border-purple-500/40 transition-all group">
            <div className="space-y-4">
              <div className="p-3 bg-cyan-950/40 border border-cyan-500/30 rounded-xl inline-block text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.15)]">
                <Shield size={20} className="group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-cyan-300 transition-colors">Sovereign Profile Nodes</h3>
              <p className="text-xs text-purple-200/65 leading-relaxed">
                Publish credentials, manage handles, and verify streaks through Firebase Firestore databases. Earn XP dynamically based on team collaboration and sandbox interactions.
              </p>
            </div>
            <div className="mt-8 border-t border-purple-500/10 pt-4 text-[10px] font-mono tracking-widest text-cyan-400 uppercase">
              <span>Firebase Auth & DB</span>
            </div>
          </div>

          {/* Card 3: Interactive Draw Stages */}
          <div className="p-8 bg-[#100c28]/80 border border-purple-500/20 backdrop-blur-sm rounded-2xl flex flex-col justify-between hover:border-purple-500/40 transition-all group">
            <div className="space-y-4">
              <div className="p-3 bg-pink-950/40 border border-pink-500/30 rounded-xl inline-block text-pink-400 shadow-[0_0_12px_rgba(236,72,153,0.15)]">
                <Edit2 size={20} className="group-hover:-translate-y-1 transition-transform" />
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-cyan-300 transition-colors">Infinite Whiteboard Drawing</h3>
              <p className="text-xs text-purple-200/65 leading-relaxed">
                Design system components, wireframe UI layouts, and map logic structures on our collaborative vector sandbox stages. Completely vector responsive with dynamic resizers.
              </p>
            </div>
            <div className="mt-8 border-t border-purple-500/10 pt-4 text-[10px] font-mono tracking-widest text-pink-400 uppercase">
              <span>HTML5 Canvas Integration</span>
            </div>
          </div>

          {/* Card 4: Simulated Secure Runtimes */}
          <div className="md:col-span-2 p-8 bg-[#100c28]/80 border border-purple-500/20 backdrop-blur-sm rounded-2xl flex flex-col justify-between hover:border-purple-500/40 transition-all group relative overflow-hidden">
            <div className="absolute bottom-0 right-0 w-64 h-36 bg-[#080514] border-t border-l border-purple-500/10 rounded-tl-xl p-3 font-mono text-[9px] text-cyan-400 hidden sm:block">
              <div className="flex items-center gap-1.5 border-b border-purple-500/15 pb-1.5 mb-1.5">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                <span>Container Specs diagnostics</span>
              </div>
              <div className="space-y-1 opacity-70">
                <p># systemctl status devpulse-sandbox</p>
                <p className="text-green-400">● devpulse-sandbox.service - Interactive Sandbox</p>
                <p>   Active: active (running) since Mon 2026</p>
                <p>   Main PID: 3000 (node)</p>
                <p>   Tasks: 18 (limit: 4915)</p>
              </div>
            </div>
            <div className="space-y-4 max-w-lg">
              <div className="p-3 bg-purple-950/40 border border-purple-500/30 rounded-xl inline-block text-purple-400 shadow-[0_0_12px_rgba(124,58,237,0.15)]">
                <FolderTree size={20} className="group-hover:scale-105 transition-transform" />
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-cyan-300 transition-colors">Isolated CLI Playground Console</h3>
              <p className="text-xs text-purple-200/65 leading-relaxed">
                Toggle a secure sandbox CLI terminal with a single shortcut key (`Ctrl + ``). Review running container parameters, query logs, trigger network diagnostics, or trigger system hacking simulations directly.
              </p>
            </div>
            <div className="mt-8 flex items-center gap-3 border-t border-purple-500/10 pt-4 text-[10px] font-mono tracking-widest text-cyan-400 uppercase">
              <span>Toggle: Ctrl + `</span>
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
              <span>Diagnostic System Logs</span>
            </div>
          </div>

        </div>
      </section>


      {/* INTERACTIVE DEMO CLI SECTION */}
      <section id="demo" className="py-24 px-6 bg-[#0a081e]/60 relative z-10 border-y border-purple-500/10">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Headline info Left */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-pink-950/40 border border-pink-500/30 rounded-full text-xs text-pink-400 font-mono tracking-widest uppercase">
              <Activity size={12} className="animate-pulse" />
              Instant Evaluation
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif font-extrabold text-white tracking-tight">
              Test Our Sandbox Core Live
            </h2>
            <p className="text-xs sm:text-sm text-purple-200/70 leading-relaxed">
              Don't just read about it. Our terminal execution core can be tested directly right from this landing page. Access configuration structures, map developer specs, or perform recursive decrypt simulation workflows.
            </p>
            
            {/* Quick Macro actions */}
            <div className="space-y-3">
              <p className="text-[10px] font-mono font-bold tracking-widest text-purple-300/50 uppercase">Pre-Loaded Diagnostic Scripts</p>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => runMacroCommand('features')}
                  disabled={isHacking}
                  className="px-3 py-2 bg-[#120e2e] hover:bg-[#1c1647] border border-purple-500/25 rounded-lg text-xs font-mono text-cyan-400 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Play size={10} />
                  view_features.sh
                </button>
                <button 
                  onClick={() => runMacroCommand('specs')}
                  disabled={isHacking}
                  className="px-3 py-2 bg-[#120e2e] hover:bg-[#1c1647] border border-purple-500/25 rounded-lg text-xs font-mono text-purple-300 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Play size={10} />
                  system_specs.config
                </button>
                <button 
                  onClick={() => runMacroCommand('profile')}
                  disabled={isHacking}
                  className="px-3 py-2 bg-[#120e2e] hover:bg-[#1c1647] border border-purple-500/25 rounded-lg text-xs font-mono text-green-400 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Play size={10} />
                  onboarding_specs.md
                </button>
                <button 
                  onClick={() => runMacroCommand('hack')}
                  disabled={isHacking}
                  className="px-3 py-2 bg-pink-950/30 hover:bg-pink-900/30 border border-pink-500/25 rounded-lg text-xs font-mono text-pink-400 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Play size={10} className="text-pink-500" />
                  cyber_decrypt.sh
                </button>
              </div>
            </div>
          </div>

          {/* Terminal Console Right */}
          <div className="lg:col-span-7">
            <div className="w-full bg-[#080514]/90 border border-purple-500/30 rounded-2xl shadow-[0_0_40px_rgba(124,58,237,0.15)] overflow-hidden">
              
              {/* Terminal Header */}
              <div className="bg-[#110c26] px-5 py-3 flex items-center justify-between border-b border-purple-500/15">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                </div>
                <span className="text-[9px] font-mono tracking-widest text-cyan-400 uppercase">GUEST_CONSOLE // Sandbox Mode</span>
                <span className="text-[9px] font-mono text-purple-300/40">ttyS001</span>
              </div>

              {/* Terminal Output history */}
              <div className="p-6 h-72 overflow-y-auto font-mono text-xs space-y-2.5 scrollbar-thin scrollbar-thumb-purple-900 scrollbar-track-transparent">
                {terminalHistory.map((item, index) => (
                  <div key={index} className="leading-relaxed">
                    {item.type === 'input' && (
                      <span className="text-purple-300">{item.text}</span>
                    )}
                    {item.type === 'output' && (
                      <span className="text-gray-300">{item.text}</span>
                    )}
                    {item.type === 'success' && (
                      <span className="text-emerald-400">{item.text}</span>
                    )}
                    {item.type === 'error' && (
                      <span className="text-pink-400">{item.text}</span>
                    )}
                    {item.type === 'cyber' && (
                      <span className="text-cyan-400 animate-pulse">{item.text}</span>
                    )}
                  </div>
                ))}
                {isHacking && (
                  <div className="flex items-center gap-2 text-cyan-400 animate-pulse">
                    <RefreshCw size={12} className="animate-spin" />
                    <span>Executing pipeline instructions...</span>
                  </div>
                )}
                <div ref={terminalBottomRef} />
              </div>

              {/* Terminal input form */}
              <form onSubmit={handleTerminalSubmit} className="flex border-t border-purple-500/15 bg-[#0a071a]/95">
                <span className="pl-6 py-4 text-xs font-mono text-pink-500 font-bold select-none">guest@devpulse:~$</span>
                <input 
                  type="text"
                  disabled={isHacking}
                  value={terminalInput}
                  onChange={(e) => setTerminalInput(e.target.value)}
                  placeholder="Type specs, features, hack, clear or help..."
                  className="flex-1 bg-transparent px-2.5 py-4 text-xs font-mono text-white focus:outline-none placeholder-purple-300/30"
                />
                <button 
                  type="submit"
                  disabled={isHacking}
                  className="px-6 py-4 bg-purple-950/30 hover:bg-purple-900/40 border-l border-purple-500/15 text-[10px] font-mono tracking-widest text-cyan-400 uppercase transition-all cursor-pointer hover:text-white"
                >
                  Execute
                </button>
              </form>

            </div>
          </div>

        </div>
      </section>


      {/* TECHNICAL ARCHITECTURE SECTION */}
      <section id="architecture" className="py-24 px-6 relative z-10 max-w-6xl mx-auto">
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-950/40 border border-purple-500/30 rounded-full text-xs text-purple-300 font-mono tracking-widest uppercase">
            <Cpu size={12} className="text-cyan-400 animate-pulse" />
            Under the Hood
          </div>
          <h2 className="text-3xl sm:text-4xl font-serif font-extrabold text-white tracking-tight">
            The Decoupled Micro-Architecture
          </h2>
          <p className="text-xs sm:text-sm text-purple-200/60 max-w-xl mx-auto">
            Engineered with high precision to guarantee zero lag, instantaneous collaborative alignments, and resilient database states.
          </p>
        </div>

        {/* Visual flow chart */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          
          <div className="p-7 bg-[#100c28]/40 border border-purple-500/15 rounded-2xl relative space-y-4 hover:border-purple-500/30 transition-all">
            <span className="absolute -top-4 left-6 px-3 py-1 bg-cyan-950 border border-cyan-500/30 text-[10px] font-mono font-bold text-cyan-400 rounded-full uppercase">Layer 01</span>
            <div className="p-3 bg-cyan-950/30 border border-cyan-500/20 text-cyan-400 inline-block rounded-xl">
              <Globe size={18} />
            </div>
            <h3 className="text-base font-bold text-white">WebSocket Signal Layer</h3>
            <p className="text-xs text-purple-200/60 leading-relaxed">
              Express servers bound on port 3000 drive active Socket.io communication threads. Canvas positions, shapes, and terminal commands are bridged synchronously to active client sockets.
            </p>
          </div>

          <div className="p-7 bg-[#100c28]/40 border border-purple-500/15 rounded-2xl relative space-y-4 hover:border-purple-500/30 transition-all">
            <span className="absolute -top-4 left-6 px-3 py-1 bg-purple-950 border border-purple-500/30 text-[10px] font-mono font-bold text-purple-300 rounded-full uppercase">Layer 02</span>
            <div className="p-3 bg-purple-950/30 border border-purple-500/20 text-purple-300 inline-block rounded-xl">
              <Layers size={18} />
            </div>
            <h3 className="text-base font-bold text-white">Serverless Database Engine</h3>
            <p className="text-xs text-purple-200/60 leading-relaxed">
              Sovereign developer nodes register handles, streaks, and accumulated global XP securely inside Cloud Firestore structures. Isolated database models prevent unauthorized modifications.
            </p>
          </div>

          <div className="p-7 bg-[#100c28]/40 border border-purple-500/15 rounded-2xl relative space-y-4 hover:border-purple-500/30 transition-all">
            <span className="absolute -top-4 left-6 px-3 py-1 bg-pink-950 border border-pink-500/30 text-[10px] font-mono font-bold text-pink-400 rounded-full uppercase">Layer 03</span>
            <div className="p-3 bg-pink-950/30 border border-pink-500/20 text-pink-400 inline-block rounded-xl">
              <Cpu size={18} />
            </div>
            <h3 className="text-base font-bold text-white">Full-Stack Proxy Execution</h3>
            <p className="text-xs text-purple-200/60 leading-relaxed">
              Secure express gateways intercept API logs, manage session states, and connect to internal JSON clusters or relational Drizzle ORM schemas depending on database provisioning status.
            </p>
          </div>

        </div>
      </section>


      {/* PRICING PLANS SECTION */}
      <section id="pricing" className="py-24 px-6 bg-[#0a081e]/60 relative z-10 border-t border-purple-500/10">
        <div className="max-w-6xl mx-auto space-y-12">
          
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-950/40 border border-green-500/30 rounded-full text-xs text-green-400 font-mono tracking-widest uppercase">
              <Lock size={12} className="text-green-400 animate-pulse" />
              Sovereign Licensing
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif font-extrabold text-white tracking-tight">
              Honest Plans. Scaled to Your Needs.
            </h2>
            <p className="text-xs sm:text-sm text-purple-200/60 max-w-xl mx-auto">
              Choose the layout size that fits your team. Every account receives immediate sandbox execution and a global developer node record.
            </p>

            {/* Toggle Switch */}
            <div className="flex items-center justify-center gap-3 pt-6">
              <span className={`text-xs font-mono uppercase tracking-wider ${pricingPeriod === 'monthly' ? 'text-cyan-400 font-bold' : 'text-purple-300/40'}`}>Monthly</span>
              <button 
                onClick={() => setPricingPeriod(pricingPeriod === 'monthly' ? 'yearly' : 'monthly')}
                className="w-12 h-6 bg-[#130f2c] border border-purple-500/30 rounded-full relative flex items-center p-1 cursor-pointer transition-all focus:outline-none"
              >
                <div className={`w-4 h-4 bg-cyan-400 rounded-full transition-all ${pricingPeriod === 'yearly' ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
              <span className={`text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 ${pricingPeriod === 'yearly' ? 'text-cyan-400 font-bold' : 'text-purple-300/40'}`}>
                Yearly
                <span className="text-[9px] font-mono font-bold text-green-400 border border-green-500/30 bg-green-950/40 px-1.5 py-0.5 rounded uppercase">
                  20% OFF
                </span>
              </span>
            </div>
          </div>

          {/* Pricing cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Plan 1 */}
            <div className="p-8 bg-[#100c28]/50 border border-purple-500/15 rounded-2xl flex flex-col justify-between hover:border-purple-500/30 transition-all relative">
              <div className="space-y-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white">Sovereign Node</h3>
                  <p className="text-xs text-purple-200/50">For individual developers wanting real-time workspace alignments.</p>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-mono font-extrabold text-white">$0</span>
                  <span className="text-xs text-purple-200/50 font-mono uppercase">/ free forever</span>
                </div>
                <hr className="border-purple-500/10" />
                <ul className="space-y-3 text-xs text-purple-200/70">
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-cyan-400 flex-shrink-0" />
                    <span>Cryptographic node profiles</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-cyan-400 flex-shrink-0" />
                    <span>WebSocket active chat uplink</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-cyan-400 flex-shrink-0" />
                    <span>Simulated diagnostic sandbox CLI</span>
                  </li>
                  <li className="flex items-center gap-2 opacity-30">
                    <Check size={14} className="text-cyan-400 flex-shrink-0" />
                    <span>Pro collaborative whiteboards</span>
                  </li>
                </ul>
              </div>
              <button 
                onClick={() => onLaunch()}
                className="w-full mt-8 bg-[#18123d] hover:bg-[#20194e] border border-purple-500/30 hover:border-cyan-400 text-white font-mono font-bold text-xs tracking-wider uppercase py-3.5 rounded-xl transition-all cursor-pointer"
              >
                Launch Now
              </button>
            </div>

            {/* Plan 2: Best Value */}
            <div className="p-8 bg-[#141031]/90 border border-cyan-400/30 rounded-2xl flex flex-col justify-between hover:border-cyan-400/50 transition-all relative shadow-[0_0_30px_rgba(6,182,212,0.1)]">
              <span className="absolute -top-3.5 right-6 px-3 py-1 bg-gradient-to-r from-pink-500 to-purple-600 text-[10px] font-mono font-bold text-white rounded-full uppercase tracking-wider shadow-lg">Most Popular</span>
              <div className="space-y-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    Cluster Squad
                    <Sparkles size={14} className="text-cyan-400 animate-pulse" />
                  </h3>
                  <p className="text-xs text-purple-200/50">For modern engineering clusters seeking unified whiteboard blueprints.</p>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-mono font-extrabold text-cyan-400">
                    ${pricingPeriod === 'monthly' ? '19' : '15'}
                  </span>
                  <span className="text-xs text-purple-200/50 font-mono uppercase">/ member / month</span>
                </div>
                <hr className="border-purple-500/10" />
                <ul className="space-y-3 text-xs text-purple-200/70">
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-cyan-400 flex-shrink-0" />
                    <span className="font-bold text-white">Everything in Sovereign Node</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-cyan-400 flex-shrink-0" />
                    <span>Collaborative vector whiteboards</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-cyan-400 flex-shrink-0" />
                    <span>Relational database bridges</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-cyan-400 flex-shrink-0" />
                    <span>Double streak & XP multiplier milestones</span>
                  </li>
                </ul>
              </div>
              <button 
                onClick={() => onLaunch('pro')}
                className="w-full mt-8 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-mono font-bold text-xs tracking-wider uppercase py-3.5 rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.25)] border border-cyan-400/20 cursor-pointer hover:scale-[1.01]"
              >
                Unlock Pro Cluster
              </button>
            </div>

            {/* Plan 3 */}
            <div className="p-8 bg-[#100c28]/50 border border-purple-500/15 rounded-2xl flex flex-col justify-between hover:border-purple-500/30 transition-all relative">
              <div className="space-y-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white">Enterprise Galaxy</h3>
                  <p className="text-xs text-purple-200/50">For large-scale decentralized developer systems.</p>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-mono font-extrabold text-white">Custom</span>
                  <span className="text-xs text-purple-200/50 font-mono uppercase">/ tailored SLA</span>
                </div>
                <hr className="border-purple-500/10" />
                <ul className="space-y-3 text-xs text-purple-200/70">
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-cyan-400 flex-shrink-0" />
                    <span className="font-bold text-white">Infinite active members</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-cyan-400 flex-shrink-0" />
                    <span>Relational PostgreSQL integration</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-cyan-400 flex-shrink-0" />
                    <span>Dedicated SLA & private telemetry runtimes</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-cyan-400 flex-shrink-0" />
                    <span>Isolated VPC secure server ports</span>
                  </li>
                </ul>
              </div>
              <button 
                onClick={() => onLaunch('enterprise')}
                className="w-full mt-8 bg-[#18123d] hover:bg-[#20194e] border border-purple-500/30 hover:border-cyan-400 text-white font-mono font-bold text-xs tracking-wider uppercase py-3.5 rounded-xl transition-all cursor-pointer"
              >
                Contact Sales
              </button>
            </div>

          </div>
        </div>
      </section>


      {/* TESTIMONIALS SECTION */}
      <section id="testimonials" className="py-24 px-6 relative z-10 max-w-6xl mx-auto">
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-950/40 border border-purple-500/30 rounded-full text-xs text-purple-300 font-mono tracking-widest uppercase">
            <Award size={12} className="text-cyan-400" />
            Social Consensus
          </div>
          <h2 className="text-3xl sm:text-4xl font-serif font-extrabold text-white tracking-tight">
            Loved by Sovereign Engineers
          </h2>
          <p className="text-xs sm:text-sm text-purple-200/60 max-w-xl mx-auto">
            Read how other developers and technical staff are synchronizing their workspace channels and active logic stages using DevPulse.
          </p>
        </div>

        {/* Testimonial Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          <div className="p-6 bg-[#100c28]/60 border border-purple-500/15 rounded-2xl hover:border-purple-500/30 transition-all flex flex-col justify-between">
            <p className="text-xs text-purple-200/70 leading-relaxed italic mb-6">
              "Being able to map whiteboard designs and group communications in the exact same interface where my terminal sandbox runs has tripled my workflow throughput. DevPulse is simply remarkable."
            </p>
            <div className="flex items-center gap-3 border-t border-purple-500/10 pt-4">
              <span className="text-2xl">🦀</span>
              <div>
                <p className="text-xs font-bold text-white">@rust_jedi</p>
                <p className="text-[10px] font-mono text-purple-300/40 uppercase">Principal Systems Dev</p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-[#100c28]/60 border border-purple-500/15 rounded-2xl hover:border-purple-500/30 transition-all flex flex-col justify-between">
            <p className="text-xs text-purple-200/70 leading-relaxed italic mb-6">
              "Firebase Firestore sync ensures our daily streak configurations and collaborative milestones are never lost. Incredible UI, extremely modern, and extremely fast."
            </p>
            <div className="flex items-center gap-3 border-t border-purple-500/10 pt-4">
              <span className="text-2xl">⚛️</span>
              <div>
                <p className="text-xs font-bold text-white">@react_queen</p>
                <p className="text-[10px] font-mono text-purple-300/40 uppercase">Staff Frontend Architect</p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-[#100c28]/60 border border-purple-500/15 rounded-2xl hover:border-purple-500/30 transition-all flex flex-col justify-between md:col-span-2 lg:col-span-1">
            <p className="text-xs text-purple-200/70 leading-relaxed italic mb-6">
              "The shortcut command key terminal is brilliant. I can monitor our container spec variables and diagnostic parameters on port 3000 in a heartbeat. Truly designed for power users."
            </p>
            <div className="flex items-center gap-3 border-t border-purple-500/10 pt-4">
              <span className="text-2xl">🚀</span>
              <div>
                <p className="text-xs font-bold text-white">@kube_commander</p>
                <p className="text-[10px] font-mono text-purple-300/40 uppercase">SRE Infrastructure Architect</p>
              </div>
            </div>
          </div>

        </div>
      </section>


      {/* ACCORDION FAQ SECTION */}
      <section id="faq" className="py-24 px-6 bg-[#0a081e]/60 relative z-10 border-t border-purple-500/10">
        <div className="max-w-4xl mx-auto space-y-12">
          
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-950/40 border border-cyan-500/30 rounded-full text-xs text-cyan-400 font-mono tracking-widest uppercase">
              <Plus size={12} />
              Resolving Queries
            </div>
            <h2 className="text-3xl sm:text-4xl font-serif font-extrabold text-white tracking-tight">
              Frequently Queried Specifications
            </h2>
            <p className="text-xs sm:text-sm text-purple-200/60">
              Can't find what you're looking for? Reach out directly via our guest console.
            </p>
          </div>

          {/* Accordion List */}
          <div className="space-y-4">
            {faqData.map((item, idx) => {
              const isExpanded = expandedFaq === idx;
              return (
                <div 
                  key={idx} 
                  className="bg-[#110c2a]/80 border border-purple-500/15 rounded-xl overflow-hidden transition-all duration-300 hover:border-purple-500/30"
                >
                  <button 
                    onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left font-sans font-bold text-sm text-white focus:outline-none transition-colors hover:text-cyan-300 cursor-pointer"
                  >
                    <span>{item.q}</span>
                    {isExpanded ? (
                      <ChevronUp size={16} className="text-cyan-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown size={16} className="text-cyan-400 flex-shrink-0" />
                    )}
                  </button>
                  
                  {isExpanded && (
                    <div className="px-6 pb-5 text-xs text-purple-200/70 border-t border-purple-500/10 pt-4 leading-relaxed bg-[#0e0a24]/30 animate-fade-in">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>


      {/* NEWSLETTER CTA SECTION */}
      <section className="py-24 px-6 relative z-10 max-w-4xl mx-auto text-center space-y-8">
        
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-cyan-500/5 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="space-y-4">
          <h2 className="text-3xl font-serif font-extrabold text-white">Subscribe to Satellite Operations Logbook</h2>
          <p className="text-xs sm:text-sm text-purple-200/65 max-w-lg mx-auto">
            Stay updated with custom changelogs, sandbox updates, network telemetry diagnostics, and secure database releases directly from devpulse engineering.
          </p>
        </div>

        {newsletterSubscribed ? (
          <div className="p-4 bg-green-950/40 border border-green-500/30 rounded-xl text-green-200 text-xs font-mono max-w-md mx-auto flex items-center justify-center gap-2.5">
            <Check size={14} className="text-green-400" />
            <span>Node Subscribed! Operations Logbook deployed to inbox.</span>
          </div>
        ) : (
          <form 
            onSubmit={(e) => { e.preventDefault(); if (newsletterEmail.trim()) { setNewsletterSubscribed(true); } }}
            className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
          >
            <div className="relative flex-1">
              <Mail size={14} className="absolute left-3.5 top-3.5 text-purple-400/50" />
              <input 
                type="email"
                required
                placeholder="satellite_operator@domain.com"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                className="w-full bg-[#110c2a]/80 border border-purple-500/25 focus:border-cyan-400 rounded-xl pl-10 pr-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400/40 transition-all font-mono"
              />
            </div>
            <button 
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 border border-purple-500/30 text-white font-mono font-bold text-xs tracking-wider uppercase rounded-xl transition-all shadow-[0_0_15px_rgba(124,58,237,0.2)] cursor-pointer hover:scale-[1.01]"
            >
              Subscribe Node
            </button>
          </form>
        )}

      </section>


      {/* CORPORATE MODERN FOOTER */}
      <footer className="bg-[#04030d] border-t border-purple-500/10 px-6 py-16 relative z-10 text-xs text-purple-300/40 font-mono">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Code2 className="text-white" size={14} />
              </div>
              <span className="font-serif font-extrabold text-base text-white tracking-tight">DevPulse</span>
            </div>
            <p className="text-[10px] leading-relaxed max-w-xs text-purple-200/40 font-mono">
              The supreme, decoupled, high-performance real-time environment built for elite dev clusters worldwide.
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-bold text-purple-200/70 tracking-widest uppercase">Ecosystem Core</p>
            <ul className="space-y-2 text-[10px] text-purple-200/40 hover:text-purple-200/60">
              <li><button onClick={() => scrollToSection('features')} className="hover:text-cyan-400 cursor-pointer">Workspace Capabilities</button></li>
              <li><button onClick={() => scrollToSection('demo')} className="hover:text-cyan-400 cursor-pointer">Interactive CLI Sandbox</button></li>
              <li><button onClick={() => scrollToSection('architecture')} className="hover:text-cyan-400 cursor-pointer">Technical Layers</button></li>
              <li><button onClick={() => scrollToSection('pricing')} className="hover:text-cyan-400 cursor-pointer">Pricing Plans</button></li>
            </ul>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-bold text-purple-200/70 tracking-widest uppercase">Satellite Uplinks</p>
            <ul className="space-y-2 text-[10px]">
              <li><a href="#" className="hover:text-cyan-400 flex items-center gap-1.5">Github Repository <ExternalLink size={10} /></a></li>
              <li><a href="#" className="hover:text-cyan-400 flex items-center gap-1.5">Twitter Operator <ExternalLink size={10} /></a></li>
              <li><a href="#" className="hover:text-cyan-400 flex items-center gap-1.5">DevPulse Discord <ExternalLink size={10} /></a></li>
              <li><a href="#" className="hover:text-cyan-400 flex items-center gap-1.5">Operations Logbook <ExternalLink size={10} /></a></li>
            </ul>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-bold text-purple-200/70 tracking-widest uppercase">System Telemetry</p>
            <div className="p-3 bg-[#080614] border border-purple-500/15 rounded-xl space-y-2 text-[9px]">
              <div className="flex items-center justify-between text-emerald-400">
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> SATELLITE_UPLINK</span>
                <span>ONLINE</span>
              </div>
              <div className="flex items-center justify-between">
                <span>PORT_3000_PROXY</span>
                <span className="text-purple-300/60">ACTIVE</span>
              </div>
              <div className="flex items-center justify-between">
                <span>FIRESTORE_DB</span>
                <span className="text-cyan-400">SECURED</span>
              </div>
            </div>
          </div>

        </div>

        <hr className="border-purple-500/10 mb-8" />

        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px]">
          <p>© 2026 DevPulse central cluster registry. All rights reserved globally.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-cyan-400">Sovereign SLA</a>
            <span>•</span>
            <a href="#" className="hover:text-cyan-400">Telemetry Specs</a>
            <span>•</span>
            <a href="#" className="hover:text-cyan-400">Encryption Keys</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
