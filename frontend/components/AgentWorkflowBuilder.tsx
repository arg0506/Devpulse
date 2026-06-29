import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Plus, 
  Trash2, 
  Cpu, 
  Zap, 
  Globe, 
  Code, 
  Send, 
  Sparkles, 
  Settings, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  GitMerge, 
  Info,
  Layers,
  Clock,
  ArrowRight
} from 'lucide-react';
import { DevUser } from '../types';

interface WorkflowNode {
  id: string;
  type: 'trigger' | 'gemini' | 'search' | 'code' | 'action';
  title: string;
  x: number;
  y: number;
  config: {
    // trigger options
    triggerType?: 'webhook' | 'schedule' | 'chat_message';
    cron?: string;
    // LLM options
    prompt?: string;
    temperature?: number;
    model?: string;
    // Search options
    searchQuery?: string;
    depth?: 'standard' | 'deep';
    // Code options
    script?: string;
    language?: 'javascript' | 'python';
    // Action options
    channel?: string;
    payloadTemplate?: string;
  };
  status: 'idle' | 'running' | 'success' | 'error';
  output?: string;
}

interface WorkflowEdge {
  id: string;
  fromId: string;
  toId: string;
}

interface PresetWorkflow {
  name: string;
  desc: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export default function AgentWorkflowBuilder({ currentUser }: { currentUser: DevUser }) {
  // Nodes state
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([]);
  
  // Interaction states
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  
  // Execution states
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [currentNodeIdx, setCurrentNodeIdx] = useState<number>(-1);

  const boardRef = useRef<HTMLDivElement>(null);

  // Preset templates
  const PRESETS: Record<string, PresetWorkflow> = {
    support: {
      name: "Smart Support Auto-Responder",
      desc: "Analyzes incoming customer messages, searches documentation, and responds automatically.",
      nodes: [
        {
          id: 'node-1',
          type: 'trigger',
          title: 'On Customer Ticket',
          x: 50,
          y: 120,
          config: { triggerType: 'chat_message' },
          status: 'idle'
        },
        {
          id: 'node-2',
          type: 'search',
          title: 'Search Doc Index',
          x: 280,
          y: 50,
          config: { searchQuery: '{{trigger.message}}', depth: 'standard' },
          status: 'idle'
        },
        {
          id: 'node-3',
          type: 'gemini',
          title: 'Draft Resolution text',
          x: 520,
          y: 120,
          config: { 
            prompt: 'Draft an empathetic, expert resolution based on the original message: "{{trigger.message}}" and the documentation contents: "{{node-2.result}}".', 
            temperature: 0.2, 
            model: 'gemini-2.5-flash' 
          },
          status: 'idle'
        },
        {
          id: 'node-4',
          type: 'action',
          title: 'Send Slack Notification',
          x: 760,
          y: 120,
          config: { channel: '#support-dispatch', payloadTemplate: 'Drafted Reply:\n{{node-3.result}}' },
          status: 'idle'
        }
      ],
      edges: [
        { id: 'edge-1', fromId: 'node-1', toId: 'node-2' },
        { id: 'edge-2', fromId: 'node-2', toId: 'node-3' },
        { id: 'edge-3', fromId: 'node-3', toId: 'node-4' }
      ]
    },
    summarizer: {
      name: "Daily Tech Aggregator Bot",
      desc: "Triggers on schedule, fetches latest developer blogs, summarises updates, and executes sandboxed post formatting.",
      nodes: [
        {
          id: 'node-1',
          type: 'trigger',
          title: 'Every Day at 09:00',
          x: 50,
          y: 120,
          config: { triggerType: 'schedule', cron: '0 9 * * *' },
          status: 'idle'
        },
        {
          id: 'node-2',
          type: 'search',
          title: 'Web Search: "TypeScript 5.x"',
          x: 260,
          y: 120,
          config: { searchQuery: 'latest typescript release blog post updates 2026', depth: 'deep' },
          status: 'idle'
        },
        {
          id: 'node-3',
          type: 'gemini',
          title: 'Synthesize TL;DR',
          x: 480,
          y: 50,
          config: { prompt: 'Condense into 3 key technical takeaways: {{node-2.result}}', temperature: 0.5, model: 'gemini-2.5-pro' },
          status: 'idle'
        },
        {
          id: 'node-4',
          type: 'code',
          title: 'Sanitize Formatting script',
          x: 480,
          y: 220,
          config: { script: '// Format for Discord blocks\nconst text = inputs.tldr;\nreturn "⚡ **TECH PULSE UPDATE** ⚡\\n" + text.replace(/#/g, "›");', language: 'javascript' },
          status: 'idle'
        },
        {
          id: 'node-5',
          type: 'action',
          title: 'Post to announcements',
          x: 740,
          y: 120,
          config: { channel: '#general', payloadTemplate: '{{node-4.result}}' },
          status: 'idle'
        }
      ],
      edges: [
        { id: 'edge-1', fromId: 'node-1', toId: 'node-2' },
        { id: 'edge-2', fromId: 'node-2', toId: 'node-3' },
        { id: 'edge-3', fromId: 'node-2', toId: 'node-4' },
        { id: 'edge-4', fromId: 'node-3', toId: 'node-5' },
        { id: 'edge-5', fromId: 'node-4', toId: 'node-5' }
      ]
    }
  };

  // Load preset initially
  useEffect(() => {
    loadPreset('support');
  }, []);

  const loadPreset = (key: keyof typeof PRESETS) => {
    const preset = PRESETS[key];
    setNodes(JSON.parse(JSON.stringify(preset.nodes)));
    setEdges(JSON.parse(JSON.stringify(preset.edges)));
    setSelectedNodeId(null);
    setConnectingFromId(null);
    setIsExecuting(false);
    setCurrentNodeIdx(-1);
    setExecutionLogs([`[Preset Loaded] Activated "${preset.name}" workspace context.`]);
  };

  // Drag handlers
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if ((e.target as HTMLElement).closest('.connector-handle')) return; // ignore connector handle clicks
    setDraggingNodeId(nodeId);
    setSelectedNodeId(nodeId);
    setConnectingFromId(null);

    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      const boardRect = boardRef.current?.getBoundingClientRect();
      if (boardRect) {
        setDragOffset({
          x: e.clientX - boardRect.left - node.x,
          y: e.clientY - boardRect.top - node.y
        });
      }
    }
  };

  const handleBoardMouseMove = (e: React.MouseEvent) => {
    if (!draggingNodeId || !boardRef.current) return;
    
    const boardRect = boardRef.current.getBoundingClientRect();
    const x = Math.max(10, Math.min(boardRect.width - 220, e.clientX - boardRect.left - dragOffset.x));
    const y = Math.max(10, Math.min(boardRect.height - 120, e.clientY - boardRect.top - dragOffset.y));

    setNodes(prev => prev.map(n => n.id === draggingNodeId ? { ...n, x, y } : n));
  };

  const handleBoardMouseUp = () => {
    setDraggingNodeId(null);
  };

  // Connector drawing handler
  const handleConnectClick = (nodeId: string) => {
    if (!connectingFromId) {
      setConnectingFromId(nodeId);
      setExecutionLogs(prev => [...prev, `[Workflow Builder] Connection pipeline originating from Node: ${nodeId}`]);
    } else {
      if (connectingFromId === nodeId) {
        setConnectingFromId(null);
        return;
      }
      // Avoid duplicate edges
      const edgeExists = edges.some(e => e.fromId === connectingFromId && e.toId === nodeId);
      if (!edgeExists) {
        const newEdge: WorkflowEdge = {
          id: `edge-${Date.now()}`,
          fromId: connectingFromId,
          toId: nodeId
        };
        setEdges(prev => [...prev, newEdge]);
        setExecutionLogs(prev => [...prev, `✓ Success: Joined Node ${connectingFromId} to Node ${nodeId}`]);
      }
      setConnectingFromId(null);
    }
  };

  // Node operations
  const addNewNode = (type: WorkflowNode['type']) => {
    const titles: Record<WorkflowNode['type'], string> = {
      trigger: 'Manual API Trigger',
      gemini: 'Gemini LLM Assistant',
      search: 'Google Web Search',
      code: 'JavaScript Sanity sandbox',
      action: 'Webhook Post node'
    };

    const configs: Record<WorkflowNode['type'], any> = {
      trigger: { triggerType: 'webhook' },
      gemini: { prompt: 'Complete the response based on previous parameters.', temperature: 0.7, model: 'gemini-2.5-flash' },
      search: { searchQuery: 'AI studio updates', depth: 'standard' },
      code: { script: '// Node JS context\nconst result = inputs.query || "default";\nreturn result.toUpperCase();', language: 'javascript' },
      action: { channel: '#general', payloadTemplate: 'Agent output: {{previous}}' }
    };

    const newId = `node-${Date.now()}`;
    const newNode: WorkflowNode = {
      id: newId,
      type,
      title: `${titles[type]} [${nodes.length + 1}]`,
      x: 100 + Math.random() * 80,
      y: 100 + Math.random() * 80,
      config: configs[type],
      status: 'idle'
    };

    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(newId);
    setExecutionLogs(prev => [...prev, `[Workflow Builder] Spawned new node type: ${type}`]);
  };

  const deleteNode = (nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setEdges(prev => prev.filter(e => e.fromId !== nodeId && e.toId !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
    if (connectingFromId === nodeId) setConnectingFromId(null);
    setExecutionLogs(prev => [...prev, `[Workflow Builder] Deleted node ${nodeId}`]);
  };

  const deleteEdge = (edgeId: string) => {
    setEdges(prev => prev.filter(e => e.id !== edgeId));
    setExecutionLogs(prev => [...prev, `[Workflow Builder] Severed link: ${edgeId}`]);
  };

  const updateNodeConfig = (nodeId: string, updatedConfig: any) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, config: { ...n.config, ...updatedConfig } } : n));
  };

  const updateNodeTitle = (nodeId: string, title: string) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, title } : n));
  };

  // Execution Simulator
  const executeWorkflow = async () => {
    if (nodes.length === 0) return;
    setIsExecuting(true);
    setExecutionLogs([]);
    setNodes(prev => prev.map(n => ({ ...n, status: 'idle', output: undefined })));

    // Find trigger node as starting point
    const startNodes = nodes.filter(n => n.type === 'trigger');
    if (startNodes.length === 0) {
      setExecutionLogs([`❌ Error: No Trigger node found on the board. Workflows must originate from a Trigger Node.`]);
      setIsExecuting(false);
      return;
    }

    const log = (msg: string) => {
      setExecutionLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    log('⚡ Initializing AI Agent Workflow Pipeline simulation...');
    await new Promise(resolve => setTimeout(resolve, 800));

    // Simple queue / BFS execution path based on edges
    const visited = new Set<string>();
    const queue: string[] = startNodes.map(n => n.id);

    while (queue.length > 0) {
      const activeId = queue.shift();
      if (!activeId || visited.has(activeId)) continue;
      
      const activeNode = nodes.find(n => n.id === activeId);
      if (!activeNode) continue;

      visited.add(activeId);
      
      // Highlight Node as running
      setNodes(prev => prev.map(n => n.id === activeId ? { ...n, status: 'running' } : n));
      log(`▶ Executing [${activeNode.title}] ...`);
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Simulate output / logic based on configuration
      let status: 'success' | 'error' = 'success';
      let outcome = '';

      try {
        if (activeNode.type === 'trigger') {
          outcome = `Trigger Event generated. Event payload: { origin: "chat_message", query: "Optimize server database latency issues." }`;
        } else if (activeNode.type === 'search') {
          const q = activeNode.config.searchQuery || 'General support';
          outcome = `Search results index: [Found 3 pages]\n1. "Database Index Tuning in Postgres" (similarity: 94%)\n2. "Sovereign Cache configurations" (similarity: 88%)\n3. "Handling Prisma Connection pools in containers" (similarity: 85%)`;
        } else if (activeNode.type === 'gemini') {
          outcome = `AI Draft Outcome: "Based on Postgres documentation, the optimal resolution for database latency issues is introducing targeted indexes on foreign keys, configuring connection pooling (PgBouncer) inside the container parameters, and setting max_connections to 150."`;
        } else if (activeNode.type === 'code') {
          outcome = `Script Return: "⚡ **TECH PULSE UPDATE** ⚡ Based on Postgres documentation, the optimal resolution for database latency is configuring connection pooling..."`;
        } else if (activeNode.type === 'action') {
          outcome = `Payload successfully dispatched to Discord Channel ${activeNode.config.channel || '#general'}. HTTP Status 200 OK.`;
        }
      } catch (err: any) {
        status = 'error';
        outcome = err.message || 'Execution fault';
      }

      setNodes(prev => prev.map(n => n.id === activeId ? { ...n, status, output: outcome } : n));
      
      if (status === 'success') {
        log(`✓ Node [${activeNode.title}] finished successfully.`);
      } else {
        log(`❌ Node [${activeNode.title}] failed: ${outcome}`);
        setIsExecuting(false);
        return;
      }

      // Add child nodes to queue
      const children = edges.filter(e => e.fromId === activeId).map(e => e.toId);
      queue.push(...children);
      
      await new Promise(resolve => setTimeout(resolve, 400));
    }

    log('🎉 Complete: Workflow executed successfully. All telemetry links closed.');
    setIsExecuting(false);
  };

  // Node Color Helper
  const getNodeColorClass = (type: WorkflowNode['type'], status: WorkflowNode['status']) => {
    if (status === 'running') return 'border-amber-400 bg-amber-950/40 shadow-[0_0_20px_rgba(245,158,11,0.25)]';
    if (status === 'success') return 'border-emerald-500 bg-emerald-950/25 shadow-[0_0_20px_rgba(16,185,129,0.15)]';
    if (status === 'error') return 'border-pink-500 bg-pink-950/20';

    switch (type) {
      case 'trigger': return 'border-cyan-500/40 bg-cyan-950/15';
      case 'gemini': return 'border-purple-500/40 bg-purple-950/15';
      case 'search': return 'border-sky-500/40 bg-sky-950/15';
      case 'code': return 'border-pink-500/40 bg-pink-950/15';
      case 'action': return 'border-emerald-500/40 bg-emerald-950/15';
    }
  };

  const getNodeIcon = (type: WorkflowNode['type']) => {
    switch (type) {
      case 'trigger': return <Zap size={14} className="text-cyan-400" />;
      case 'gemini': return <Sparkles size={14} className="text-purple-400" />;
      case 'search': return <Globe size={14} className="text-sky-400" />;
      case 'code': return <Code size={14} className="text-pink-400" />;
      case 'action': return <Send size={14} className="text-emerald-400" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col md:grid md:grid-cols-12 bg-[#080611] text-purple-100 overflow-hidden h-full">
      
      {/* 1. Left Sidebar: Preset templates and Node Toolchest */}
      <div className="md:col-span-3 bg-[#0c091d] border-r border-purple-500/15 p-4 flex flex-col justify-between overflow-y-auto min-h-[220px] max-h-screen">
        <div className="space-y-6">
          
          {/* Section: Templates */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Layers size={13} className="text-cyan-400" />
              <span className="text-[10px] font-mono tracking-widest font-bold uppercase text-purple-300">Preset Templates</span>
            </div>
            <div className="space-y-2">
              {Object.keys(PRESETS).map((key) => (
                <button
                  key={key}
                  onClick={() => loadPreset(key as any)}
                  className="w-full text-left p-3 rounded-xl bg-[#120e2e]/60 border border-purple-500/10 hover:border-cyan-400/50 hover:bg-[#16123b] transition-all cursor-pointer group"
                >
                  <p className="text-xs font-serif font-extrabold text-white group-hover:text-cyan-300 transition-colors">
                    {PRESETS[key].name}
                  </p>
                  <p className="text-[10px] text-purple-300/50 leading-relaxed mt-1">
                    {PRESETS[key].desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Section: Toolchest (Spawnable Nodes) */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Plus size={13} className="text-cyan-400" />
              <span className="text-[10px] font-mono tracking-widest font-bold uppercase text-purple-300">Node Toolbox</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => addNewNode('trigger')}
                className="flex items-center gap-3 px-3 py-2.5 bg-[#14102e] border border-cyan-500/20 rounded-xl hover:border-cyan-400 text-xs font-mono text-cyan-300 font-bold transition-all hover:bg-[#18143d] cursor-pointer"
              >
                <Zap size={14} className="text-cyan-400 animate-pulse" />
                <span>+ Webhook Trigger</span>
              </button>
              
              <button
                onClick={() => addNewNode('gemini')}
                className="flex items-center gap-3 px-3 py-2.5 bg-[#14102e] border border-purple-500/20 rounded-xl hover:border-purple-400 text-xs font-mono text-purple-300 font-bold transition-all hover:bg-[#18143d] cursor-pointer"
              >
                <Sparkles size={14} className="text-purple-400" />
                <span>+ Gemini LLM Node</span>
              </button>

              <button
                onClick={() => addNewNode('search')}
                className="flex items-center gap-3 px-3 py-2.5 bg-[#14102e] border border-sky-500/20 rounded-xl hover:border-sky-400 text-xs font-mono text-sky-300 font-bold transition-all hover:bg-[#18143d] cursor-pointer"
              >
                <Globe size={14} className="text-sky-400" />
                <span>+ Google Web Search</span>
              </button>

              <button
                onClick={() => addNewNode('code')}
                className="flex items-center gap-3 px-3 py-2.5 bg-[#14102e] border border-pink-500/20 rounded-xl hover:border-pink-400 text-xs font-mono text-pink-300 font-bold transition-all hover:bg-[#18143d] cursor-pointer"
              >
                <Code size={14} className="text-pink-400" />
                <span>+ Code Executor</span>
              </button>

              <button
                onClick={() => addNewNode('action')}
                className="flex items-center gap-3 px-3 py-2.5 bg-[#14102e] border border-emerald-500/20 rounded-xl hover:border-emerald-400 text-xs font-mono text-emerald-300 font-bold transition-all hover:bg-[#18143d] cursor-pointer"
              >
                <Send size={14} className="text-emerald-400" />
                <span>+ Send DM Dispatch</span>
              </button>
            </div>
          </div>

        </div>

        {/* Workspace info footer */}
        <div className="mt-6 border-t border-purple-500/10 pt-4 text-[10px] font-mono text-purple-300/40 space-y-1 bg-[#120a2e]/20 p-2.5 rounded-xl">
          <p className="text-cyan-400 font-bold flex items-center gap-1">
            <Info size={10} />
            Node-Link Instructions
          </p>
          <p>1. Click "Connect From" handle</p>
          <p>2. Click target node's title handle to bridge the logic.</p>
        </div>
      </div>

      {/* 2. Center View: Node connection Board */}
      <div className="md:col-span-6 flex flex-col bg-[#070514] border-r border-purple-500/15 relative">
        {/* Node board header controls */}
        <div className="bg-[#120e2c]/90 px-6 py-4 border-b border-purple-500/15 flex items-center justify-between z-20 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Cpu size={15} className="text-cyan-400" />
            <span className="font-serif font-extrabold text-sm text-white tracking-wider">WORKSPACE NODE PIPELINE</span>
          </div>

          <button
            onClick={executeWorkflow}
            disabled={isExecuting || nodes.length === 0}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:via-indigo-500 hover:to-cyan-400 text-white font-mono font-bold text-[10px] tracking-widest uppercase px-4 py-2 rounded-xl transition-all disabled:opacity-50 border border-purple-400/20 cursor-pointer hover:scale-102 hover:shadow-[0_0_15px_rgba(124,58,237,0.35)]"
          >
            {isExecuting ? (
              <>
                <RefreshCw size={12} className="animate-spin text-amber-300" />
                <span>Uplink active...</span>
              </>
            ) : (
              <>
                <Play size={12} className="text-cyan-300 fill-cyan-300" />
                <span>Run Agent Pipeline</span>
              </>
            )}
          </button>
        </div>

        {/* Board Canvas */}
        <div 
          ref={boardRef}
          onMouseMove={handleBoardMouseMove}
          onMouseUp={handleBoardMouseUp}
          className="flex-1 relative overflow-hidden bg-[#05030d] select-none cursor-grab active:cursor-grabbing"
          style={{ minHeight: '400px' }}
        >
          {/* Cyber matrix background dots */}
          <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(#a78bfa_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

          {/* Connection Lines (SVG) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
            <defs>
              <linearGradient id="cyberGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.8" />
              </linearGradient>
            </defs>
            {edges.map((edge) => {
              const fromNode = nodes.find(n => n.id === edge.fromId);
              const toNode = nodes.find(n => n.id === edge.toId);
              if (!fromNode || !toNode) return null;

              // Node dimensions are approx 200px wide, 80px high
              const startX = fromNode.x + 200;
              const startY = fromNode.y + 40;
              const endX = toNode.x;
              const endY = toNode.y + 40;

              // Bezier control coordinates
              const cp1X = startX + 60;
              const cp1Y = startY;
              const cp2X = endX - 60;
              const cp2Y = endY;

              return (
                <g key={edge.id} className="group">
                  {/* Glowing background tube line */}
                  <path
                    d={`M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`}
                    fill="none"
                    stroke="rgba(6,182,212,0.15)"
                    strokeWidth={6}
                    className="group-hover:stroke-cyan-500/25 transition-all"
                  />
                  {/* Main pipeline connection bezier */}
                  <path
                    d={`M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`}
                    fill="none"
                    stroke="url(#cyberGradient)"
                    strokeWidth={2}
                    className="transition-all"
                  />
                  {/* Tiny animated signal dot pulsing down line */}
                  {isExecuting && (
                    <circle r="4" fill="#22c55e" className="animate-pulse">
                      <animateMotion
                        path={`M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`}
                        dur="3s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}
                  {/* Hover delete handle */}
                  <foreignObject
                    x={(startX + endX) / 2 - 12}
                    y={(startY + endY) / 2 - 12}
                    width="24"
                    height="24"
                    className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto"
                  >
                    <button
                      onClick={() => deleteEdge(edge.id)}
                      className="w-5 h-5 bg-pink-900 border border-pink-500/50 hover:bg-pink-600 rounded-full flex items-center justify-center text-white cursor-pointer"
                      title="Sever workflow link"
                    >
                      ×
                    </button>
                  </foreignObject>
                </g>
              );
            })}
          </svg>

          {/* Draggable Nodes */}
          {nodes.map((node) => (
            <div
              key={node.id}
              style={{ left: `${node.x}px`, top: `${node.y}px` }}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              className={`absolute w-52 rounded-xl border p-3.5 backdrop-blur-xl transition-all duration-150 cursor-grab active:cursor-grabbing select-none z-10 hover:scale-102 ${getNodeColorClass(node.type, node.status)} ${
                selectedNodeId === node.id ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#080611] shadow-[0_0_25px_rgba(6,182,212,0.25)] border-cyan-400' : ''
              }`}
            >
              {/* Node Header */}
              <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-purple-500/10">
                <div className="flex items-center gap-1.5 min-w-0">
                  {getNodeIcon(node.type)}
                  <span className="text-[11px] font-mono font-bold tracking-wide text-white truncate">
                    {node.title}
                  </span>
                </div>
                
                {/* Trash button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNode(node.id);
                  }}
                  className="p-1 hover:bg-pink-950/40 hover:text-pink-400 rounded transition-all cursor-pointer text-purple-300/40"
                  title="Remove Node"
                >
                  <Trash2 size={10} />
                </button>
              </div>

              {/* Node Contents preview */}
              <div className="space-y-1">
                <p className="text-[9px] font-mono text-purple-300/50 uppercase tracking-widest font-bold">
                  Parameters config
                </p>
                <div className="text-[10px] text-purple-200 truncate bg-purple-950/20 border border-purple-500/10 px-1.5 py-1 rounded font-mono">
                  {node.type === 'trigger' && `Event: ${node.config.triggerType}`}
                  {node.type === 'gemini' && `Prompt: ${node.config.prompt}`}
                  {node.type === 'search' && `Query: ${node.config.searchQuery}`}
                  {node.type === 'code' && `Script: JavaScript`}
                  {node.type === 'action' && `Target: ${node.config.channel}`}
                </div>
              </div>

              {/* Active / Status Dot */}
              <div className="mt-2.5 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    node.status === 'running' ? 'bg-amber-400 animate-ping' :
                    node.status === 'success' ? 'bg-emerald-400' :
                    node.status === 'error' ? 'bg-pink-500' : 'bg-purple-500/40'
                  }`} />
                  <span className="text-[8px] font-mono text-purple-300/40 font-bold uppercase tracking-wider">
                    {node.status}
                  </span>
                </div>

                {/* Connection outlet button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleConnectClick(node.id);
                  }}
                  className={`connector-handle px-1.5 py-0.5 rounded text-[8px] font-mono font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                    connectingFromId === node.id 
                      ? 'bg-amber-400 text-black border-amber-400 animate-pulse' 
                      : 'bg-purple-950/50 text-cyan-400 border-cyan-500/20 hover:border-cyan-400 hover:text-white'
                  }`}
                  title={connectingFromId ? "Complete bridge connection" : "Initiate bridge connection"}
                >
                  <GitMerge size={8} />
                  <span>{connectingFromId === node.id ? 'Connecting...' : (connectingFromId ? 'Connect here' : 'Connect link')}</span>
                </button>
              </div>
            </div>
          ))}

          {/* Canvas float info */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-3 pointer-events-none">
              <Cpu className="text-purple-500/30 animate-bounce" size={44} />
              <div>
                <p className="text-sm font-serif font-extrabold text-white">Your node blueprint is empty</p>
                <p className="text-xs text-purple-300/40 max-w-xs mt-1">
                  Load a preset workflow template from the left or drag custom webhook triggers and LLM components.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Console outputs pane at the bottom */}
        <div className="h-44 border-t border-purple-500/15 bg-[#05030c] p-4 flex flex-col justify-between font-mono">
          <div className="flex items-center justify-between border-b border-purple-500/10 pb-1.5">
            <div className="flex items-center gap-2 text-[10px] text-cyan-400 uppercase font-bold tracking-wider">
              <Layers size={10} />
              <span>Real-time Log stream</span>
            </div>
            <span className="text-[9px] text-purple-300/30 font-bold font-mono">NODE_SYNC_PIPE</span>
          </div>

          <div className="flex-1 mt-2 overflow-y-auto space-y-1 text-[10px] text-purple-300/70 scrollbar-thin">
            {executionLogs.map((logStr, idx) => (
              <div key={idx} className="leading-relaxed animate-in fade-in slide-in-from-left-1 duration-150">
                {logStr}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 3. Right Sidebar: Configurations Inspector */}
      <div className="md:col-span-3 bg-[#0c091d] p-5 flex flex-col justify-between overflow-y-auto min-h-[300px]">
        {selectedNodeId ? (
          (() => {
            const node = nodes.find(n => n.id === selectedNodeId);
            if (!node) return <p className="text-xs text-purple-300/40">Loading inspector state...</p>;

            return (
              <div className="space-y-6 flex-1 flex flex-col justify-between">
                <div className="space-y-6">
                  {/* Header */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Settings size={13} className="text-cyan-400" />
                      <span className="text-[10px] font-mono tracking-widest font-bold uppercase text-purple-300">Inspector Properties</span>
                    </div>
                    <input
                      type="text"
                      value={node.title}
                      onChange={(e) => updateNodeTitle(node.id, e.target.value)}
                      className="w-full bg-[#110d2c] border border-purple-500/20 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:ring-1 focus:ring-cyan-400/30"
                    />
                  </div>

                  {/* Form fields based on node type */}
                  <div className="space-y-4 border-t border-purple-500/10 pt-4">
                    
                    {/* TRIGGER CONFIG */}
                    {node.type === 'trigger' && (
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono font-bold text-purple-300/70 uppercase">Trigger Type</label>
                          <select
                            value={node.config.triggerType || 'webhook'}
                            onChange={(e) => updateNodeConfig(node.id, { triggerType: e.target.value })}
                            className="w-full bg-[#110d2c] border border-purple-500/20 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                          >
                            <option value="webhook">Webhook Link API</option>
                            <option value="schedule">Cron Job Schedule</option>
                            <option value="chat_message">On Channel Message</option>
                          </select>
                        </div>
                        {node.config.triggerType === 'schedule' && (
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-mono font-bold text-purple-300/70 uppercase">Cron Expression</label>
                            <input
                              type="text"
                              value={node.config.cron || '0 9 * * *'}
                              onChange={(e) => updateNodeConfig(node.id, { cron: e.target.value })}
                              className="w-full bg-[#110d2c] border border-purple-500/20 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* GEMINI CONFIG */}
                    {node.type === 'gemini' && (
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono font-bold text-purple-300/70 uppercase">Instruction System Prompt</label>
                          <textarea
                            rows={4}
                            value={node.config.prompt || ''}
                            onChange={(e) => updateNodeConfig(node.id, { prompt: e.target.value })}
                            className="w-full bg-[#110d2c] border border-purple-500/20 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-cyan-400/30 resize-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-mono font-bold text-purple-300/70 uppercase">Temperature</label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="1"
                              value={node.config.temperature ?? 0.7}
                              onChange={(e) => updateNodeConfig(node.id, { temperature: parseFloat(e.target.value) })}
                              className="w-full bg-[#110d2c] border border-purple-500/20 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-mono font-bold text-purple-300/70 uppercase">Model variant</label>
                            <select
                              value={node.config.model || 'gemini-2.5-flash'}
                              onChange={(e) => updateNodeConfig(node.id, { model: e.target.value })}
                              className="w-full bg-[#110d2c] border border-purple-500/20 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                            >
                              <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                              <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SEARCH CONFIG */}
                    {node.type === 'search' && (
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono font-bold text-purple-300/70 uppercase">Search Query</label>
                          <input
                            type="text"
                            value={node.config.searchQuery || ''}
                            onChange={(e) => updateNodeConfig(node.id, { searchQuery: e.target.value })}
                            className="w-full bg-[#110d2c] border border-purple-500/20 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono font-bold text-purple-300/70 uppercase">Retrieval depth</label>
                          <select
                            value={node.config.depth || 'standard'}
                            onChange={(e) => updateNodeConfig(node.id, { depth: e.target.value })}
                            className="w-full bg-[#110d2c] border border-purple-500/20 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                          >
                            <option value="standard">Standard ground (3 urls)</option>
                            <option value="deep">Deep index (10 urls)</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {/* CODE CONFIG */}
                    {node.type === 'code' && (
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono font-bold text-purple-300/70 uppercase">Sandboxed script code</label>
                          <textarea
                            rows={6}
                            value={node.config.script || ''}
                            onChange={(e) => updateNodeConfig(node.id, { script: e.target.value })}
                            className="w-full bg-[#110d2c] border border-purple-500/20 rounded-xl px-3 py-2 text-[11px] text-pink-300 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-400/30 resize-none whitespace-pre"
                          />
                        </div>
                      </div>
                    )}

                    {/* ACTION CONFIG */}
                    {node.type === 'action' && (
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono font-bold text-purple-300/70 uppercase">Post Channel Target</label>
                          <select
                            value={node.config.channel || '#general'}
                            onChange={(e) => updateNodeConfig(node.id, { channel: e.target.value })}
                            className="w-full bg-[#110d2c] border border-purple-500/20 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                          >
                            <option value="#general">#general</option>
                            <option value="#announcements">#announcements</option>
                            <option value="#support-dispatch">#support-dispatch</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono font-bold text-purple-300/70 uppercase">Payload format markdown</label>
                          <textarea
                            rows={3}
                            value={node.config.payloadTemplate || ''}
                            onChange={(e) => updateNodeConfig(node.id, { payloadTemplate: e.target.value })}
                            className="w-full bg-[#110d2c] border border-purple-500/20 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                          />
                        </div>
                      </div>
                    )}

                  </div>
                </div>

                {/* Simulated runtime inspection output box */}
                {node.output && (
                  <div className="mt-4 border-t border-purple-500/10 pt-4 space-y-2">
                    <span className="text-[9px] font-mono text-cyan-400 font-bold uppercase tracking-widest">
                      Output telemetry
                    </span>
                    <div className="bg-[#05030c] border border-purple-500/20 p-2.5 rounded-xl font-mono text-[9px] text-emerald-400 leading-normal max-h-40 overflow-y-auto">
                      {node.output}
                    </div>
                  </div>
                )}
              </div>
            );
          })()
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12 space-y-3 pointer-events-none">
            <Settings size={28} className="text-purple-500/30" />
            <div>
              <p className="text-xs font-mono font-bold text-purple-300/50 uppercase">Properties Inspector</p>
              <p className="text-[10px] text-purple-300/30 max-w-[180px] mt-1 mx-auto leading-normal">
                Click any node on the pipeline board to configure parameters, system prompts, or script files.
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
