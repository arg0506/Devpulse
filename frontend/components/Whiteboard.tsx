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
  RefreshCw
} from 'lucide-react';
import { socket } from '../socket';
import { WhiteboardElement, WhiteboardTool, DevUser } from '../types';

interface WhiteboardProps {
  currentUser: DevUser;
  onClose: () => void;
}

const COLORS = [
  '#f85149', // Red
  '#58a6ff', // Blue
  '#3fb950', // Green
  '#eed812', // Yellow
  '#d854ff', // Purple
  '#ffffff', // White
];

export default function Whiteboard({ currentUser, onClose }: WhiteboardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [elements, setElements] = useState<WhiteboardElement[]>([]);
  const [tool, setTool] = useState<WhiteboardTool>('line');
  const [color, setColor] = useState<string>('#58a6ff');
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentElement, setCurrentElement] = useState<Partial<WhiteboardElement> | null>(null);

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
  }, [elements]);

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
  }, [elements, currentElement]);

  // Helper function to render a single shape
  const drawElement = (ctx: CanvasRenderingContext2D, elem: WhiteboardElement) => {
    ctx.strokeStyle = elem.color;
    ctx.fillStyle = elem.color;
    ctx.lineWidth = elem.type === 'rectangle' || elem.type === 'circle' ? 2 : 3;
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

    setIsDrawing(true);

    const newId = `draw-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const initialElem: Partial<WhiteboardElement> = {
      id: newId,
      type: tool === 'eraser' ? 'line' : (tool as any),
      x: startX,
      y: startY,
      width: 0,
      height: 0,
      color: tool === 'eraser' ? '#0d1117' : color, // background color for eraser
      createdBy: currentUser.id,
      username: currentUser.username,
      points: tool === 'line' || tool === 'eraser' ? [startX, startY] : [],
    };

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

  const handleClear = () => {
    setElements([]);
    socket.emit('whiteboard:clear');
  };

  const handleDeleteElement = (id: string) => {
    setElements((prev) => prev.filter((e) => e.id !== id));
    socket.emit('whiteboard:delete', id);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#07090e] relative">
      {/* Toolbar */}
      <div className="bg-[#0c0e15]/95 border-b border-[#1f293d] p-4 flex flex-wrap items-center justify-between gap-4 z-10 backdrop-blur-md shadow-md">
        {/* Draw tools */}
        <div className="flex items-center gap-1 bg-[#05060a] p-1.5 border border-[#1f293d] rounded-xl shadow-inner">
          <button
            onClick={() => setTool('line')}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              tool === 'line' 
                ? 'bg-cyan-500/25 text-cyan-400 border border-cyan-500/35 shadow-[0_0_10px_rgba(6,182,212,0.15)] font-bold' 
                : 'text-gray-400 hover:text-white hover:bg-white/[0.02] border border-transparent'
            }`}
            title="Free Pencil"
          >
            <PenTool size={16} />
          </button>
          <button
            onClick={() => setTool('rectangle')}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              tool === 'rectangle' 
                ? 'bg-cyan-500/25 text-cyan-400 border border-cyan-500/35 shadow-[0_0_10px_rgba(6,182,212,0.15)] font-bold' 
                : 'text-gray-400 hover:text-white hover:bg-white/[0.02] border border-transparent'
            }`}
            title="Rectangle"
          >
            <Square size={16} />
          </button>
          <button
            onClick={() => setTool('circle')}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              tool === 'circle' 
                ? 'bg-cyan-500/25 text-cyan-400 border border-cyan-500/35 shadow-[0_0_10px_rgba(6,182,212,0.15)] font-bold' 
                : 'text-gray-400 hover:text-white hover:bg-white/[0.02] border border-transparent'
            }`}
            title="Circle"
          >
            <Circle size={16} />
          </button>
          <button
            onClick={() => setTool('arrow')}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              tool === 'arrow' 
                ? 'bg-cyan-500/25 text-cyan-400 border border-cyan-500/35 shadow-[0_0_10px_rgba(6,182,212,0.15)] font-bold' 
                : 'text-gray-400 hover:text-white hover:bg-white/[0.02] border border-transparent'
            }`}
            title="Vector Arrow"
          >
            <ArrowRight size={16} />
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`p-2 rounded-lg transition-all cursor-pointer ${
              tool === 'eraser' 
                ? 'bg-cyan-500/25 text-cyan-400 border border-cyan-500/35 shadow-[0_0_10px_rgba(6,182,212,0.15)] font-bold' 
                : 'text-gray-400 hover:text-white hover:bg-white/[0.02] border border-transparent'
            }`}
            title="Eraser tool"
          >
            <Eraser size={16} />
          </button>
        </div>

        {/* Colors selector */}
        {tool !== 'eraser' && (
          <div className="flex items-center gap-2 bg-[#05060a] p-1.5 border border-[#1f293d] rounded-xl shadow-inner">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={`w-5 h-5 rounded-full border-2 transition-all cursor-pointer hover:scale-110 ${
                  color === c ? 'border-white scale-110 shadow-[0_0_8px_rgba(255,255,255,0.4)]' : 'border-[#121620] hover:border-gray-400'
                }`}
              />
            ))}
          </div>
        )}

        {/* Global Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 text-xs px-3.5 py-2 bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-500/30 rounded-xl transition-all shadow-sm cursor-pointer hover:-translate-y-0.5"
            title="Clear all doodles"
          >
            <Trash2 size={13} />
            <span className="font-semibold tracking-wider uppercase text-[10px]">Clear Canvas</span>
          </button>
        </div>
      </div>

      {/* Interactive Drawing Canvas */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden bg-[#07090e] cursor-crosshair">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="absolute inset-0"
        />

        {/* Float user badge */}
        <div className="absolute top-5 left-5 pointer-events-none bg-[#0e121a]/90 border border-[#1f293d] px-4 py-2 rounded-xl flex items-center gap-2 text-xs text-[#8b9ba8] shadow-2xl backdrop-blur-md">
          <Sparkles size={12} className="text-yellow-400 animate-pulse" />
          <span className="font-mono text-[11px] tracking-wide">COLLABORATIVE DESIGN TERMINAL: ACTIVE</span>
        </div>
      </div>
    </div>
  );
}
