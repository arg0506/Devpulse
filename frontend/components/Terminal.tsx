import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, X, HelpCircle, ChevronRight, Play } from 'lucide-react';
import { socket } from '../socket';

interface TerminalProps {
  onClose: () => void;
  userId: string;
  username: string;
}

interface LogLine {
  text: string;
  isError?: boolean;
  isPending?: boolean;
  type?: 'input' | 'output';
}

export default function Terminal({ onClose, userId, username }: TerminalProps) {
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<LogLine[]>([
    { text: 'DevPulse Sandbox Terminal Console [v1.4.2-stable]', type: 'output' },
    { text: 'Type "help" to list available server-side community controls.', type: 'output' },
    { text: '', type: 'output' },
  ]);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Scroll to bottom on updates
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  useEffect(() => {
    // Focus terminal input on mount
    inputRef.current?.focus();

    // Listen to socket responses
    socket.on('terminal:response', (data: { output: string; isError?: boolean; isPending?: boolean }) => {
      if (data.output === 'CLEAR_CONSOLE') {
        setHistory([]);
        return;
      }

      setHistory((prev) => {
        // Remove active pending if it was pending
        const filtered = prev.filter(line => !line.isPending);
        return [
          ...filtered,
          {
            text: data.output,
            isError: data.isError,
            isPending: data.isPending,
            type: 'output',
          },
        ];
      });
    });

    return () => {
      socket.off('terminal:response');
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = command.trim();
    if (!cmd) return;

    // Append to terminal history
    setHistory((prev) => [...prev, { text: `$ ${cmd}`, type: 'input' }]);
    setCommandHistory((prev) => [cmd, ...prev]);
    setHistoryIndex(-1);
    setCommand('');

    // Send command to backend
    socket.emit('terminal:command', { command: cmd, userId, username });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const nextIndex = historyIndex + 1;
        setHistoryIndex(nextIndex);
        setCommand(commandHistory[nextIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIndex = historyIndex - 1;
        setHistoryIndex(nextIndex);
        setCommand(commandHistory[nextIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommand('');
      }
    }
  };

  const formatText = (text: string) => {
    // Handle pseudo terminal styles e.g. [[b;#58a6ff;]some bold text]
    // Regex matches [[style_configs]inner_text]
    const regex = /\[\[b;([^;]+);\]([^\]]+)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<span key={lastIndex}>{text.substring(lastIndex, match.index)}</span>);
      }
      const color = match[1];
      const content = match[2];
      parts.push(
        <span key={match.index} style={{ color, fontWeight: 'bold' }}>
          {content}
        </span>
      );
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(<span key={lastIndex}>{text.substring(lastIndex)}</span>);
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div className="bg-[#080a0f]/95 border-t border-[#1e293b] flex flex-col h-80 font-mono text-xs shadow-[0_-15px_30px_rgba(0,0,0,0.7)] z-40 relative backdrop-blur-md">
      {/* Terminal Title Bar */}
      <div className="bg-[#0e1118]/90 px-5 py-3 flex items-center justify-between border-b border-[#1e293b] text-[#8b9ba8]">
        <div className="flex items-center gap-2.5">
          <TerminalIcon size={14} className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
          <span className="text-xs font-bold tracking-wider text-[#e1e4ea]">Console Interactive Sandbox Pipeline</span>
          <span className="text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold tracking-wider uppercase animate-pulse">
            CLUSTER ONLINE
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setHistory((prev) => [...prev, { text: `$ help`, type: 'input' }]);
              socket.emit('terminal:command', { command: 'help', userId, username });
            }}
            className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 cursor-pointer bg-cyan-950/40 px-2.5 py-1 border border-cyan-500/20 rounded-md shadow-sm"
            title="Help list"
          >
            <HelpCircle size={12} />
            <span>Help List</span>
          </button>
          <button
            onClick={onClose}
            className="hover:text-white hover:bg-white/[0.05] p-1 rounded transition-all cursor-pointer text-gray-500"
            title="Close Terminal (Ctrl + `)"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Terminal Lines Output */}
      <div className="flex-1 overflow-y-auto p-5 space-y-2.5 scrollbar-thin scrollbar-thumb-cyan-950 scrollbar-track-transparent">
        {history.map((line, idx) => (
          <div
            key={idx}
            className={`whitespace-pre-wrap leading-relaxed tracking-wide font-mono ${
              line.type === 'input' 
                ? 'text-cyan-400 font-semibold' 
                : line.isError 
                  ? 'text-red-400 border-l-2 border-red-500/60 pl-2 bg-red-950/10 py-1' 
                  : line.isPending
                    ? 'text-yellow-400 animate-pulse font-semibold'
                    : 'text-[#c0c6d3]'
            }`}
          >
            {formatText(line.text)}
          </div>
        ))}
        <div ref={terminalEndRef} />
      </div>

      {/* Terminal Interactive Input */}
      <form onSubmit={handleSubmit} className="border-t border-[#1e293b] bg-[#06080c]/90 px-5 py-3 flex items-center gap-3">
        <ChevronRight size={16} className="text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)] flex-shrink-0 animate-pulse" />
        <span className="text-cyan-500 font-bold font-mono text-xs select-none">dp_cluster:~</span>
        <input
          ref={inputRef}
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type 'git status', 'pulse-stats', 'ai summarize react', or 'help'..."
          className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-[#e1e4ea] font-mono text-xs placeholder-gray-600 tracking-wider"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
        />
        <button
          type="submit"
          className="bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 hover:bg-cyan-500 hover:text-black transition-all px-3 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase flex items-center gap-1 cursor-pointer"
          title="Run Command"
        >
          <span>Run</span>
          <Play size={10} />
        </button>
      </form>
    </div>
  );
}
