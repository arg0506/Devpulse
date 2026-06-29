import React, { useEffect, useRef, useState } from 'react';
import { 
  Square, 
  Circle, 
  Minus, 
  ArrowRight, 
  Trash2, 
  MousePointer, 
  PenTool, 
  Eraser, 
  Sparkles,
  RefreshCw,
  Type,
  Triangle,
  Download,
  Undo2,
  Grid,
  CircleDot
} from 'lucide-react';
import { socket } from '../socket';
import { WhiteboardElement, WhiteboardTool, DevUser } from '../types';

interface WhiteboardProps {
  currentUser: DevUser;
  onClose: () => void;
}

const COLORS = [
  '#06b6d4', // neon cyan
  '#ec4899', // neon pink
  '#7c3aed', // neon violet
  '#22c55e', // pulsing lime green
  '#eab308', // glowing yellow
  '#ffffff', // starlight white
];

export default function Whiteboard({ currentUser, onClose }: WhiteboardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [elements, setElements] = useState<WhiteboardElement[]>([]);
  const [tool, setTool] = useState<WhiteboardTool | 'triangle'>('line');
  const [color, setColor] = useState<string>('#06b6d4');
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentElement, setCurrentElement] = useState<Partial<WhiteboardElement> | null>(null);

  // Advanced features state
  const [lineWidth, setLineWidth] = useState<number>(3);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  
  // Text tool state
  const [inputPos, setInputPos] = useState<{ x: number; y: number } | null>(null);
  const [showTextInput, setShowTextInput] = useState<boolean>(false);
  const [textValue, setTextValue] = useState<string>('');

  // Resize canvas safely with ResizeObserver
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        // Keep standard high DPI backing store if possible
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(dpr, dpr);
        }
        
        // Redraw on resize
        redraw();
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [elements, showGrid]);

  // Initial load and Socket.io listeners
  useEffect(() => {
    // Listen for current elements on joining
    socket.on('init:whiteboard', (initialElements: WhiteboardElement[]) => {
      setElements(initialElements);
    });

    // Listen for incoming elements drawn by other users
    socket.on('whiteboard:drawn', (element: WhiteboardElement) => {
      setElements((prev) => {
        const index = prev.findIndex((e) => e.id === element.id);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = element;
          return updated;
        }
        return [...prev, element];
      });
    });

    socket.on('whiteboard:deleted', (id: string) => {
      setElements((prev) => prev.filter((e) => e.id !== id));
    });

    socket.on('whiteboard:cleared', () => {
      setElements([]);
    });

    // Request fresh state on connect
    socket.emit('whiteboard:get-state');

    return () => {
      socket.off('init:whiteboard');
      socket.off('whiteboard:drawn');
      socket.off('whiteboard:deleted');
      socket.off('whiteboard:cleared');
    };
  }, []);

  // Redraw all elements to the canvas context
  const redraw = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Grid System for VS Code feel
    if (showGrid) {
      ctx.strokeStyle = '#21262d';
      ctx.lineWidth = 0.5;
      const gridSize = 25;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    }

    // Draw saved elements
    elements.forEach((elem) => {
      drawElement(ctx, elem);
    });

    // Draw active drawing element if any
    if (currentElement) {
      drawElement(ctx, currentElement as WhiteboardElement);
    }
  };

  // Run redraw every time elements or active element changes
  useEffect(() => {
    redraw();
  }, [elements, currentElement, showGrid]);

  // Helper function to render a single shape
  const drawElement = (ctx: CanvasRenderingContext2D, elem: WhiteboardElement) => {
    ctx.strokeStyle = elem.color;
    ctx.fillStyle = elem.color;
    const strokeWidth = (elem as any).lineWidth || (elem.type === 'rectangle' || elem.type === 'circle' ? 2 : 3);
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch (elem.type) {
      case 'rectangle':
        ctx.strokeRect(elem.x, elem.y, elem.width, elem.height);
        break;

      case 'circle':
        ctx.beginPath();
        const rx = elem.width / 2;
        const ry = elem.height / 2;
        ctx.ellipse(elem.x + rx, elem.y + ry, Math.abs(rx), Math.abs(ry), 0, 0, 2 * Math.PI);
        ctx.stroke();
        break;

      case 'triangle' as any:
        ctx.beginPath();
        ctx.moveTo(elem.x + elem.width / 2, elem.y);
        ctx.lineTo(elem.x + elem.width, elem.y + elem.height);
        ctx.lineTo(elem.x, elem.y + elem.height);
        ctx.closePath();
        ctx.stroke();
        break;

      case 'text':
        ctx.font = `bold 14px "JetBrains Mono", ui-monospace, SFMono-Regular, monospace`;
        ctx.fillText(elem.text || '', elem.x, elem.y);
        break;

      case 'line':
        if (elem.points && elem.points.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(elem.points[0], elem.points[1]);
          for (let i = 2; i < elem.points.length; i += 2) {
            ctx.lineTo(elem.points[i], elem.points[i + 1]);
          }
          ctx.stroke();
        }
        break;

      case 'arrow':
        ctx.beginPath();
        ctx.moveTo(elem.x, elem.y);
        const tox = elem.x + elem.width;
        const toy = elem.y + elem.height;
        ctx.lineTo(tox, toy);
        ctx.stroke();

        // Draw arrow tip
        const angle = Math.atan2(elem.height, elem.width);
        ctx.beginPath();
        ctx.moveTo(tox, toy);
        ctx.lineTo(tox - 12 * Math.cos(angle - Math.PI / 6), toy - 12 * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(tox - 12 * Math.cos(angle + Math.PI / 6), toy - 12 * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
        break;
    }
  };

  // Mouse / Drawing Events
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === 'select') return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;

    if (tool === 'text') {
      setInputPos({ x: startX, y: startY });
      setTextValue('');
      setShowTextInput(true);
      return;
    }

    setIsDrawing(true);

    const newId = `draw-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const initialElem: Partial<WhiteboardElement> = {
      id: newId,
      type: tool === 'eraser' ? 'line' : (tool as any),
      x: startX,
      y: startY,
      width: 0,
      height: 0,
      color: tool === 'eraser' ? '#08060f' : color, // background color for eraser
      createdBy: currentUser.id,
      username: currentUser.username,
      points: tool === 'line' || tool === 'eraser' ? [startX, startY] : [],
      lineWidth: tool === 'eraser' ? lineWidth * 2.5 : lineWidth,
    } as any;

    setCurrentElement(initialElem);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentElement) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    if (tool === 'line' || tool === 'eraser') {
      const updatedPoints = [...(currentElement.points || []), currentX, currentY];
      setCurrentElement((prev) => prev ? { ...prev, points: updatedPoints } : null);
    } else {
      const width = currentX - (currentElement.x || 0);
      const height = currentY - (currentElement.y || 0);
      setCurrentElement((prev) => prev ? { ...prev, width, height } : null);
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentElement) return;
    setIsDrawing(false);

    const completed = currentElement as WhiteboardElement;
    
    // Save locally
    setElements((prev) => [...prev, completed]);
    
    // Broadcast via socket
    socket.emit('whiteboard:draw', completed);
    setCurrentElement(null);
  };

  // Submit typed text on board
  const handleTextSubmit = (val: string) => {
    if (!val.trim() || !inputPos) {
      setShowTextInput(false);
      return;
    }

    const newId = `draw-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newElem: WhiteboardElement = {
      id: newId,
      type: 'text',
      x: inputPos.x,
      y: inputPos.y,
      width: val.length * 8,
      height: 18,
      color: color,
      createdBy: currentUser.id,
      username: currentUser.username,
      text: val,
    };

    setElements((prev) => [...prev, newElem]);
    socket.emit('whiteboard:draw', newElem);
    setShowTextInput(false);
    setInputPos(null);
  };

  const handleClear = () => {
    setElements([]);
    socket.emit('whiteboard:clear');
  };

  // Undo your last drawing element
  const handleUndo = () => {
    const myElements = elements.filter(e => e.createdBy === currentUser.id);
    if (myElements.length === 0) return;
    
    const lastMyElem = myElements[myElements.length - 1];
    setElements((prev) => prev.filter((e) => e.id !== lastMyElem.id));
    socket.emit('whiteboard:delete', lastMyElem.id);
  };

  // Export board as PNG
  const handleExportPNG = () => {
    if (!canvasRef.current) return;
    
    // Create a temporary link
    const link = document.createElement('a');
    link.download = `devpulse-codesign-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="flex-1 flex flex-col bg-[#08060f] relative h-full overflow-hidden">
      {/* Toolbar */}
      <div className="bg-[#110d24]/90 border-b border-purple-500/20 p-4 flex flex-wrap items-center justify-between gap-4 z-10 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
        {/* Draw tools */}
        <div className="flex items-center gap-1 bg-[#161230]/75 p-1.5 border border-purple-500/30 rounded-xl">
          <button
            onClick={() => setTool('line')}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              tool === 'line' 
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/45 shadow-[0_0_15px_rgba(6,182,212,0.25)] font-bold' 
                : 'text-purple-300/60 hover:text-white hover:bg-purple-900/20 border border-transparent'
            }`}
            title="Free Pencil"
          >
            <PenTool size={16} />
          </button>
          <button
            onClick={() => setTool('rectangle')}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              tool === 'rectangle' 
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/45 shadow-[0_0_15px_rgba(6,182,212,0.25)] font-bold' 
                : 'text-purple-300/60 hover:text-white hover:bg-purple-900/20 border border-transparent'
            }`}
            title="Rectangle"
          >
            <Square size={16} />
          </button>
          <button
            onClick={() => setTool('circle')}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              tool === 'circle' 
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/45 shadow-[0_0_15px_rgba(6,182,212,0.25)] font-bold' 
                : 'text-purple-300/60 hover:text-white hover:bg-purple-900/20 border border-transparent'
            }`}
            title="Circle"
          >
            <Circle size={16} />
          </button>
          <button
            onClick={() => setTool('triangle')}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              tool === 'triangle' 
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/45 shadow-[0_0_15px_rgba(6,182,212,0.25)] font-bold' 
                : 'text-purple-300/60 hover:text-white hover:bg-purple-900/20 border border-transparent'
            }`}
            title="Triangle"
          >
            <Triangle size={16} />
          </button>
          <button
            onClick={() => setTool('arrow')}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              tool === 'arrow' 
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/45 shadow-[0_0_15px_rgba(6,182,212,0.25)] font-bold' 
                : 'text-purple-300/60 hover:text-white hover:bg-purple-900/20 border border-transparent'
            }`}
            title="Vector Arrow"
          >
            <ArrowRight size={16} />
          </button>
          <button
            onClick={() => setTool('text')}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              tool === 'text' 
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/45 shadow-[0_0_15px_rgba(6,182,212,0.25)] font-bold' 
                : 'text-purple-300/60 hover:text-white hover:bg-purple-900/20 border border-transparent'
            }`}
            title="Text Label"
          >
            <Type size={16} />
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              tool === 'eraser' 
                ? 'bg-pink-500/20 text-pink-400 border border-pink-500/45 shadow-[0_0_15px_rgba(236,72,153,0.25)] font-bold' 
                : 'text-purple-300/60 hover:text-white hover:bg-purple-900/20 border border-transparent'
            }`}
            title="Eraser tool"
          >
            <Eraser size={16} />
          </button>
        </div>

        {/* Brush Stroke thickness selection */}
        <div className="flex items-center gap-1.5 bg-[#161230]/75 p-1.5 border border-purple-500/30 rounded-xl">
          <span className="text-[10px] font-mono font-bold text-purple-400 uppercase px-1.5">Weight:</span>
          {[2, 5, 10].map((w) => (
            <button
              key={w}
              onClick={() => setLineWidth(w)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                lineWidth === w 
                  ? 'bg-cyan-500/30 text-cyan-400 border border-cyan-500/40 font-bold' 
                  : 'text-purple-300/55 hover:text-white hover:bg-purple-950/30 border border-transparent'
              }`}
            >
              {w === 2 ? 'Thin' : w === 5 ? 'Medium' : 'Thick'}
            </button>
          ))}
        </div>

        {/* Colors selector */}
        {tool !== 'eraser' && (
          <div className="flex items-center gap-2 bg-[#161230]/75 p-1.5 border border-purple-500/30 rounded-xl">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={`w-5 h-5 rounded-full border transition-all cursor-pointer hover:scale-125 ${
                  color === c ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.8)]' : 'border-transparent'
                }`}
              />
            ))}
          </div>
        )}

        {/* Global Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Grid toggler */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border font-mono text-[10px] font-bold transition-all cursor-pointer ${
              showGrid 
                ? 'bg-purple-950/40 text-purple-300 border-purple-500/30' 
                : 'bg-black/30 text-purple-300/40 border-purple-500/10'
            }`}
            title="Toggle Visual Grid"
          >
            <Grid size={12} />
            <span>GRID</span>
          </button>

          {/* Undo */}
          <button
            onClick={handleUndo}
            disabled={elements.filter(e => e.createdBy === currentUser.id).length === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border font-mono text-[10px] font-bold bg-[#161230]/65 text-purple-300 border-purple-500/25 hover:border-cyan-500/50 hover:text-cyan-400 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
            title="Undo last action"
          >
            <Undo2 size={12} />
            <span>UNDO</span>
          </button>

          {/* Download Image */}
          <button
            onClick={handleExportPNG}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border font-mono text-[10px] font-bold bg-[#161230]/65 text-cyan-400 border-cyan-500/25 hover:border-cyan-400 hover:text-white transition-all cursor-pointer"
            title="Export Sketch as PNG"
          >
            <Download size={12} />
            <span>PNG</span>
          </button>

          {/* Clear canvas */}
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 text-xs px-3.5 py-1.5 bg-pink-950/20 hover:bg-pink-950/40 text-pink-400 border border-pink-500/35 hover:border-pink-500 rounded-xl transition-all cursor-pointer font-bold font-mono shadow-[0_0_12px_rgba(236,72,153,0.15)]"
            title="Clear all doodles"
          >
            <Trash2 size={12} />
            <span className="font-bold tracking-wider uppercase text-[10px]">Clear</span>
          </button>
        </div>
      </div>

      {/* Interactive Drawing Canvas */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden bg-[#08060f] cursor-crosshair">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="absolute inset-0"
        />

        {/* Text Input floating on board */}
        {showTextInput && inputPos && (
          <div 
            style={{ 
              position: 'absolute', 
              left: `${inputPos.x}px`, 
              top: `${inputPos.y - 12}px`, 
              zIndex: 30 
            }}
            className="animate-in fade-in zoom-in-95 duration-150"
          >
            <input
              type="text"
              autoFocus
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTextSubmit(textValue);
                if (e.key === 'Escape') {
                  setShowTextInput(false);
                  setInputPos(null);
                }
              }}
              onBlur={() => handleTextSubmit(textValue)}
              className="bg-[#120a2e] border-2 border-cyan-400 text-white font-mono text-xs px-2.5 py-1 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.5)] outline-none min-w-[150px] focus:ring-0 text-left"
              placeholder="Label content..."
            />
          </div>
        )}

        {/* Float user badge */}
        <div className="absolute top-5 left-5 pointer-events-none bg-[#110d24]/90 border border-purple-500/25 px-4 py-2 rounded-xl flex items-center gap-2 text-xs text-purple-200 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl font-mono">
          <Sparkles size={12} className="text-pink-500 animate-pulse" />
          <span className="font-mono text-[11px] font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-300">COLLABORATIVE DESIGN TERMINAL: ACTIVE</span>
        </div>
      </div>
    </div>
  );
}
