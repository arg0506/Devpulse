import React, { useEffect, useRef } from 'react';

export default function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Particle class representing stars / stardust
    class Star {
      x: number;
      y: number;
      size: number;
      baseOpacity: number;
      opacity: number;
      speedY: number;
      speedX: number;
      twinkleSpeed: number;
      color: string;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 1.5 + 0.2; // small delicate stars
        this.baseOpacity = Math.random() * 0.7 + 0.15;
        this.opacity = this.baseOpacity;
        this.speedY = - (Math.random() * 0.12 + 0.03); // slow upward drift
        this.speedX = (Math.random() * 0.08 - 0.04);  // gentle drift
        this.twinkleSpeed = Math.random() * 0.015 + 0.005;

        // Give some stars a soft cyan or magenta tint to match the nebula
        const rand = Math.random();
        if (rand < 0.15) {
          this.color = 'rgba(6, 182, 212, '; // Cyan
        } else if (rand < 0.3) {
          this.color = 'rgba(236, 72, 153, '; // Pink
        } else {
          this.color = 'rgba(255, 255, 255, '; // White
        }
      }

      update() {
        // Move
        this.y += this.speedY;
        this.x += this.speedX;

        // Wrap around borders
        if (this.y < 0) {
          this.y = height;
          this.x = Math.random() * width;
        }
        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;

        // Twinkle (sinusoidal opacity modulation)
        this.opacity = this.baseOpacity + Math.sin(Date.now() * this.twinkleSpeed) * 0.15;
        this.opacity = Math.max(0.1, Math.min(1, this.opacity));
      }

      draw(c: CanvasRenderingContext2D) {
        c.fillStyle = `${this.color}${this.opacity})`;
        c.beginPath();
        c.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        c.fill();
      }
    }

    // Initialize stars
    const starCount = Math.floor((width * height) / 14000); // responsive count
    const stars: Star[] = [];
    for (let i = 0; i < starCount; i++) {
      stars.push(new Star());
    }

    // Resize handler
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      
      // Regrow stars if count changes significantly
      const newCount = Math.floor((width * height) / 14000);
      if (Math.abs(stars.length - newCount) > 10) {
        stars.length = 0;
        for (let i = 0; i < newCount; i++) {
          stars.push(new Star());
        }
      }
    };

    window.addEventListener('resize', handleResize);

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw faint background grid lines or overlay to preserve depth
      ctx.fillStyle = 'rgba(8, 6, 20, 0.2)';
      ctx.fillRect(0, 0, width, height);

      // Draw all stars
      for (let i = 0; i < stars.length; i++) {
        stars[i].update();
        stars[i].draw(ctx);
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-[#070514]">
      {/* 1. Low-level Canvas Starfield */}
      <canvas ref={canvasRef} className="absolute inset-0 block" />

      {/* 2. Layered Mesh Gradient Nebula Glowing Orbs */}
      <div className="absolute inset-0 opacity-40 mix-blend-screen blur-[130px]">
        {/* Shifting Deep Purple Nebula Blob */}
        <div 
          className="absolute rounded-full bg-gradient-to-tr from-purple-600 to-indigo-800"
          style={{
            width: '45vw',
            height: '45vw',
            top: '-5%',
            left: '10%',
            animation: 'floatOrbPurple 35s infinite alternate ease-in-out',
            opacity: 0.45,
          }}
        />

        {/* Shifting Cyan Space Dust Blob */}
        <div 
          className="absolute rounded-full bg-gradient-to-tr from-cyan-500 to-teal-500"
          style={{
            width: '40vw',
            height: '40vw',
            bottom: '5%',
            right: '15%',
            animation: 'floatOrbCyan 28s infinite alternate ease-in-out',
            opacity: 0.35,
          }}
        />

        {/* Shifting Deep Magenta / Hot Pink Blob */}
        <div 
          className="absolute rounded-full bg-gradient-to-tr from-pink-500 to-purple-500"
          style={{
            width: '35vw',
            height: '35vw',
            top: '30%',
            right: '10%',
            animation: 'floatOrbMagenta 42s infinite alternate ease-in-out',
            opacity: 0.3,
          }}
        />

        {/* Center Moody Indigo Glow */}
        <div 
          className="absolute rounded-full bg-indigo-950/40"
          style={{
            width: '60vw',
            height: '60vw',
            top: '20%',
            left: '20%',
            opacity: 0.5,
          }}
        />
      </div>

      {/* CSS Animations Injector */}
      <style>{`
        @keyframes floatOrbPurple {
          0% { transform: translate(0, 0) scale(1) rotate(0deg); }
          50% { transform: translate(8%, 12%) scale(1.15) rotate(180deg); }
          100% { transform: translate(-5%, -8%) scale(0.9) rotate(360deg); }
        }
        @keyframes floatOrbCyan {
          0% { transform: translate(0, 0) scale(1) rotate(0deg); }
          50% { transform: translate(-12%, -8%) scale(1.1) rotate(-180deg); }
          100% { transform: translate(6%, 15%) scale(0.95) rotate(-360deg); }
        }
        @keyframes floatOrbMagenta {
          0% { transform: translate(0, 0) scale(0.95); }
          50% { transform: translate(15%, -15%) scale(1.2); }
          100% { transform: translate(-10%, 10%) scale(0.85); }
        }
      `}</style>
    </div>
  );
}
