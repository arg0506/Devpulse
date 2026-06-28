import React, { useState } from 'react';
import { DevUser } from '../types';
import { Shield, Sparkles, Terminal, Code } from 'lucide-react';

interface ProfileSelectorProps {
  onSelect: (user: DevUser) => void;
}

const PRESETS = [
  {
    username: 'react_ninja',
    role: 'Senior Frontend Engineer',
    avatarEmoji: '⚛️',
    skills: ['TS', 'React', 'Tailwind'],
  },
  {
    username: 'rust_lord',
    role: 'Core Systems Architect',
    avatarEmoji: '🦀',
    skills: ['Rust', 'K8s', 'Docker'],
  },
  {
    username: 'async_await',
    role: 'Lead API Dev',
    avatarEmoji: '🚀',
    skills: ['Node', 'PostgreSQL', 'Git'],
  },
  {
    username: 'agent_zero',
    role: 'AI Prompt Engineer',
    avatarEmoji: '🤖',
    skills: ['Python', 'Docker', 'Git'],
  }
];

const EMOJIS = ['⚛️', '🦀', '🚀', '🤖', '👾', '🐍', '☕', '🧠', '⚙️', '💻'];
const SKILLS = ['TS', 'React', 'Node', 'Rust', 'Docker', 'Python', 'PostgreSQL', 'Tailwind', 'K8s', 'Git'];

export default function ProfileSelector({ onSelect }: ProfileSelectorProps) {
  const [customUser, setCustomUser] = useState<string>('');
  const [customRole, setCustomRole] = useState<string>('Full-Stack Engineer');
  const [customAvatar, setCustomAvatar] = useState<string>('👾');
  const [selectedSkills, setSelectedSkills] = useState<string[]>(['TS', 'React']);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);

  const handleSelectPreset = (preset: typeof PRESETS[0]) => {
    onSelect({
      id: `dev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      username: preset.username,
      role: preset.role,
      avatarEmoji: preset.avatarEmoji,
      skills: preset.skills,
      status: 'online',
      streakCount: Math.floor(Math.random() * 12) + 1,
      xpPoints: Math.floor(Math.random() * 250) + 50
    });
  };

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUser.trim()) return;

    onSelect({
      id: `dev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      username: customUser.trim().toLowerCase().replace(/\s+/g, '_'),
      role: customRole,
      avatarEmoji: customAvatar,
      skills: selectedSkills,
      status: 'online',
      streakCount: 1,
      xpPoints: 10
    });
  };

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skill));
    } else {
      if (selectedSkills.length < 5) {
        setSelectedSkills([...selectedSkills, skill]);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-[#e1e4ea] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background Glow Orbs */}
      <div className="absolute w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[160px] top-[-150px] left-[-150px] animate-pulse" />
      <div className="absolute w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[160px] bottom-[-150px] right-[-150px] animate-pulse" />

      <div className="w-full max-w-2xl bg-[#0f121a]/85 border border-[#1f293d] rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-xl overflow-hidden relative z-10 transition-all">
        {/* Terminal / Control Header */}
        <div className="bg-[#131722]/90 px-5 py-4 flex items-center justify-between border-b border-[#1f293d]">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-red-500/60 border border-red-500/40 block hover:scale-105 transition-transform" />
            <span className="w-3.5 h-3.5 rounded-full bg-yellow-500/60 border border-yellow-500/40 block hover:scale-105 transition-transform" />
            <span className="w-3.5 h-3.5 rounded-full bg-green-500/60 border border-green-500/40 block hover:scale-105 transition-transform" />
          </div>
          <span className="text-xs font-mono text-[#8b9ba8] tracking-widest uppercase">devpulse_uplink_auth_v1.sh</span>
          <div className="w-12" />
        </div>

        {/* Workspace Body */}
        <div className="p-8 sm:p-10">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center p-4 bg-gradient-to-tr from-cyan-500/10 to-purple-500/10 rounded-2xl border border-cyan-500/35 text-cyan-400 mb-4 shadow-[0_0_20px_rgba(6,182,212,0.15)] animate-bounce duration-1000">
              <Terminal size={36} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2.5 bg-gradient-to-r from-white via-[#f0f3ff] to-[#a5b4fc] bg-clip-text text-transparent">
              Access DevPulse Console
            </h1>
            <p className="text-sm text-[#8b9ba8] max-w-lg mx-auto leading-relaxed">
              Connect your developer capsule to join the real-time node cluster, design system diagrams, and execute sandbox shell events.
            </p>
          </div>

          {/* Toggle Modes with Modern Tab Design */}
          <div className="flex bg-[#0a0c12]/80 border border-[#1f293d] p-1.5 rounded-xl mb-8">
            <button
              onClick={() => setIsCustomMode(false)}
              className={`flex-1 py-2.5 text-xs font-semibold tracking-wider uppercase rounded-lg transition-all duration-200 ${
                !isCustomMode
                  ? 'bg-gradient-to-r from-cyan-600/30 to-blue-600/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)] font-bold'
                  : 'border border-transparent text-[#8b9ba8] hover:text-white'
              }`}
            >
              Preset Personas
            </button>
            <button
              onClick={() => setIsCustomMode(true)}
              className={`flex-1 py-2.5 text-xs font-semibold tracking-wider uppercase rounded-lg transition-all duration-200 ${
                isCustomMode
                  ? 'bg-gradient-to-r from-purple-600/30 to-fuchsia-600/20 text-purple-300 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.1)] font-bold'
                  : 'border border-transparent text-[#8b9ba8] hover:text-white'
              }`}
            >
              Configure Identity
            </button>
          </div>

          {!isCustomMode ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectPreset(preset)}
                  className="bg-[#0b0d14]/70 border border-[#1f293d] hover:border-cyan-500/50 rounded-xl p-5 text-left transition-all hover:-translate-y-1 hover:shadow-[0_10px_25px_rgba(6,182,212,0.08)] duration-200 group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-cyan-500/5 to-transparent rounded-bl-full pointer-events-none" />
                  <div className="flex items-start justify-between relative z-10">
                    <div className="text-3xl mb-3 p-1.5 bg-[#121622] border border-[#1f293d] rounded-lg shadow-sm">
                      {preset.avatarEmoji}
                    </div>
                    <span className="text-[10px] tracking-wider uppercase font-mono bg-[#112435] text-cyan-400 border border-cyan-500/30 px-2.5 py-1 rounded-full group-hover:bg-cyan-500 group-hover:text-black group-hover:font-bold transition-all">
                      Select
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-sm group-hover:text-cyan-400 transition-colors">
                    @{preset.username}
                  </h3>
                  <p className="text-xs text-[#8b9ba8] mb-4 font-medium">{preset.role}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {preset.skills.map((skill, sIdx) => (
                      <span
                        key={sIdx}
                        className="text-[9px] font-mono bg-[#141a29] text-gray-400 px-2.5 py-0.5 border border-[#1f293d] rounded"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <form onSubmit={handleCreateCustom} className="space-y-5 relative z-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-bold tracking-widest text-[#8b9ba8] mb-1.5 uppercase font-mono">UPLINK HANDLE</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs text-purple-400 font-mono">@</span>
                    <input
                      type="text"
                      maxLength={18}
                      placeholder="code_ninja"
                      value={customUser}
                      onChange={(e) => setCustomUser(e.target.value)}
                      className="w-full bg-[#0a0c12] border border-[#1f293d] rounded-xl pl-8 pr-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 transition-all font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-widest text-[#8b9ba8] mb-1.5 uppercase font-mono">ASSIGNED POSITION</label>
                  <input
                    type="text"
                    placeholder="Staff Tech Lead"
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    className="w-full bg-[#0a0c12] border border-[#1f293d] rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 transition-all"
                  />
                </div>
              </div>

              {/* Avatar Selector */}
              <div>
                <label className="block text-[10px] font-bold tracking-widest text-[#8b9ba8] mb-1.5 uppercase font-mono">IDENTIFIER TOKENS (AVATAR)</label>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 p-3 bg-[#0a0c12] border border-[#1f293d] rounded-xl">
                  {EMOJIS.map((emoji) => (
                    <button
                      type="button"
                      key={emoji}
                      onClick={() => setCustomAvatar(emoji)}
                      className={`text-2xl p-2 rounded-lg transition-all hover:bg-[#1a2030] ${
                        customAvatar === emoji 
                          ? 'bg-purple-500/20 border-2 border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.3)]' 
                          : 'border border-transparent'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Skills Tag Selector */}
              <div>
                <label className="block text-[10px] font-bold tracking-widest text-[#8b9ba8] mb-1.5 uppercase font-mono">
                  SKILL MATRIX INVENTORY (CHOOSE 2 - 5)
                </label>
                <div className="flex flex-wrap gap-2 p-3 bg-[#0a0c12] border border-[#1f293d] rounded-xl">
                  {SKILLS.map((skill) => {
                    const selected = selectedSkills.includes(skill);
                    return (
                      <button
                        type="button"
                        key={skill}
                        onClick={() => toggleSkill(skill)}
                        className={`text-xs font-mono px-3.5 py-1.5 rounded-lg border transition-all ${
                          selected
                            ? 'bg-purple-500/15 text-purple-300 border-purple-500/60 shadow-[0_0_8px_rgba(168,85,247,0.15)] font-bold'
                            : 'bg-[#121621] text-gray-400 border-[#1f293d] hover:border-gray-600'
                        }`}
                      >
                        {skill}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={!customUser.trim()}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 text-white font-bold text-xs tracking-wider uppercase py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2.5 mt-3 shadow-[0_4px_20px_rgba(147,51,234,0.25)] hover:shadow-[0_4px_25px_rgba(147,51,234,0.4)]"
              >
                <Code size={16} />
                Initialize Uplink Pipeline
              </button>
            </form>
          )}

          {/* Footer Security Badge */}
          <div className="flex items-center justify-center gap-2 mt-8 text-[11px] font-mono text-[#8b9ba8]">
            <Shield size={13} className="text-emerald-400 animate-pulse" />
            <span>Transport Encryption Active. Local JSON fallback persistence synchronized.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
