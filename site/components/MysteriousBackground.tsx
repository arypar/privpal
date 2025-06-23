"use client"
import React, { useEffect, useRef } from 'react';
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  opacity: number;
  size: number;
  type: 'crypto' | 'particle' | 'matrix';
  char?: string;
  color: string;
}
export function MysteriousBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>();
  const cryptoChars = ['₿', '⧫', '⟐', '◈', '◊', '⬢', '⬡', '◯', '⬟', '⬠', '⬢', '⟄', '⟅', '⟆'];
  const matrixChars = ['0', '1', 'A', 'B', 'C', 'D', 'E', 'F', '⚡', '◊', '◈'];
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    const initParticles = () => {
      particlesRef.current = [];
      const particleCount = Math.floor((canvas.width * canvas.height) / 8000);
      for (let i = 0; i < particleCount; i++) {
        const type = Math.random() < 0.3 ? 'crypto' : Math.random() < 0.6 ? 'matrix' : 'particle';
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 2,
          vy: type === 'matrix' ? Math.random() * 3 + 1 : (Math.random() - 0.5) * 2,
          opacity: Math.random() * 0.8 + 0.2,
          size: type === 'crypto' ? Math.random() * 20 + 10 : Math.random() * 3 + 1,
          type,
          char: type === 'crypto' ? cryptoChars[Math.floor(Math.random() * cryptoChars.length)] :
                type === 'matrix' ? matrixChars[Math.floor(Math.random() * matrixChars.length)] : undefined,
          color: type === 'crypto' ? '#10B981' : 
                 type === 'matrix' ? '#22C55E' : 
                 `hsl(${Math.random() * 60 + 200}, 70%, 60%)`
        });
      }
    };
    initParticles();
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current.forEach((particle, index) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        if (particle.x < -50) particle.x = canvas.width + 50;
        if (particle.x > canvas.width + 50) particle.x = -50;
        if (particle.y < -50) particle.y = canvas.height + 50;
        if (particle.y > canvas.height + 50) particle.y = -50;
        particle.opacity = Math.sin(Date.now() * 0.001 + index) * 0.3 + 0.5;
        ctx.save();
        ctx.globalAlpha = particle.opacity;
        if (particle.type === 'crypto' || particle.type === 'matrix') {
          ctx.fillStyle = particle.color;
          ctx.font = `${particle.size}px monospace`;
          ctx.textAlign = 'center';
          ctx.shadowColor = particle.color;
          ctx.shadowBlur = 15;
          ctx.fillText(particle.char!, particle.x, particle.y);
        } else {
          ctx.fillStyle = particle.color;
          ctx.shadowColor = particle.color;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        if (particle.type === 'particle') {
          particlesRef.current.forEach((otherParticle, otherIndex) => {
            if (otherIndex <= index || otherParticle.type !== 'particle') return;
            const dx = particle.x - otherParticle.x;
            const dy = particle.y - otherParticle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 150) {
              ctx.save();
              ctx.globalAlpha = (150 - distance) / 150 * 0.2;
              ctx.strokeStyle = '#3B82F6';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(particle.x, particle.y);
              ctx.lineTo(otherParticle.x, otherParticle.y);
              ctx.stroke();
              ctx.restore();
            }
          });
        }
      });
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);
  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}
    />
  );
}