"use client"
import React, { useState, useEffect, useRef } from 'react';
interface GlitchTextProps {
  children: string;
  className?: string;
  glitchIntensity?: number;
  changeSpeed?: number;
  constantGlitch?: boolean;
}
export function GlitchText({ 
  children, 
  className = "", 
  glitchIntensity = 0.3, 
  changeSpeed = 50,
  constantGlitch = false 
}: GlitchTextProps) {
  // Ensure children is always a string
  const safeChildren = typeof children === 'string' ? children : String(children || '');
  const [displayText, setDisplayText] = useState(safeChildren);
  const [isGlitching, setIsGlitching] = useState(constantGlitch);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const glitchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const glitchChars = [
    '!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '-', '_', '=', '+',
    '[', ']', '{', '}', '|', '\\', ';', ':', '"', "'", '<', '>', ',', '.', '?', '/',
    // Numbers and letters mixed
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
    'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    // Special Unicode characters for more authentic glitch look
    '█', '▓', '▒', '░', '▀', '▄', '▌', '▐', '■', '□', '▪', '▫',
    '●', '○', '◆', '◇', '◈', '◊', '⬢', '⬡', '⟐', '⟄', '⟅', '⟆',
    '⚡', '⚠', '⚪', '⚫', '⭐', '✦', '✧', '✩', '✪', '✫', '✬', '✭',
    'Ω', 'Φ', 'Ψ', 'Δ', 'Θ', 'Λ', 'Π', 'Σ', 'α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ',
    '₿', '₡', '₢', '₣', '₤', '₥', '₦', '₧', '₨', '₩', '₪', '₫', '€', '₭', '₮', '₯',
    // Binary/tech looking chars
    '0', '1', 'X', 'F', 'E', 'A', 'B', 'C', 'D'
  ];
  const corruptText = (text: string, intensity: number): string => {
    // Ensure text is a string
    const safeText = typeof text === 'string' ? text : String(text || '');
    return safeText.split('').map(char => {
      if (char === ' ') return ' '; // Preserve spaces
      if (Math.random() < intensity) {
        return glitchChars[Math.floor(Math.random() * glitchChars.length)];
      }
      return char;
    }).join('');
  };
  const startGlitching = () => {
    if (intervalRef.current) return; // Already glitching
    setIsGlitching(true);
    intervalRef.current = setInterval(() => {
      setDisplayText(corruptText(safeChildren, glitchIntensity));
    }, changeSpeed);
  };
  const stopGlitching = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsGlitching(false);
    setDisplayText(safeChildren); // Reset to original text
  };
  useEffect(() => {
    if (constantGlitch) {
      startGlitching();
    } else {
      // Random glitch intervals
      const startRandomGlitch = () => {
        startGlitching();
        // Stop glitching after a random duration
        glitchTimeoutRef.current = setTimeout(() => {
          stopGlitching();
          // Schedule next glitch
          const nextGlitchDelay = 2000 + Math.random() * 8000; // 2-10 seconds
          setTimeout(startRandomGlitch, nextGlitchDelay);
        }, 100 + Math.random() * 400); // Glitch for 100-500ms
      };
      // Start the first glitch after a delay
      const initialDelay = Math.random() * 3000;
      setTimeout(startRandomGlitch, initialDelay);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (glitchTimeoutRef.current) {
        clearTimeout(glitchTimeoutRef.current);
      }
    };
      }, [safeChildren, glitchIntensity, changeSpeed, constantGlitch]);
  return (
    <span className={`${className} relative inline-block`}>
      {/* Original text - always visible */}
      <span className="relative z-10">{safeChildren}</span>
      {/* Glitch layers that appear on top */}
      {isGlitching && (
        <>
          {/* Red glitch layer */}
          <span 
            className="absolute inset-0 text-red-500 opacity-60 animate-pulse z-20"
            style={{
              transform: 'translateX(1px) translateY(-0.5px)',
              filter: 'blur(0.5px)',
              mixBlendMode: 'multiply'
            }}
          >
            {displayText}
          </span>
          {/* Cyan glitch layer */}
          <span 
            className="absolute inset-0 text-cyan-400 opacity-50 animate-pulse z-20"
            style={{
              transform: 'translateX(-1px) translateY(0.5px)',
              filter: 'blur(0.3px)',
              mixBlendMode: 'screen'
            }}
          >
            {displayText}
          </span>
          {/* Corrupted overlay */}
          <span 
            className="absolute inset-0 text-white opacity-30 animate-ping z-30"
            style={{
              transform: 'translateX(0.5px)',
              filter: 'blur(1px)',
              textShadow: '0 0 3px #ff0040, 0 0 6px #00ffff'
            }}
          >
            {displayText}
          </span>
        </>
      )}
      {/* Subtle background blur when glitching */}
      {isGlitching && (
        <div 
          className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-transparent to-cyan-500/10 animate-pulse z-0"
          style={{ filter: 'blur(2px)' }}
        />
      )}
    </span>
  );
}
// Preset variations for easy use
export function NavGlitchText({ children, className = "" }: { children: string; className?: string }) {
  return (
    <GlitchText 
      className={className}
      glitchIntensity={0.15} // Lower intensity so original text shows through more
      changeSpeed={50} // Slower changes
      constantGlitch={false}
    >
      {children}
    </GlitchText>
  );
}
// Special logo component that keeps text completely readable - no character corruption
export function LogoGlitchText({ children, className = "" }: { children: string; className?: string }) {
  const [isGlitching, setIsGlitching] = React.useState(false);
  const glitchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  React.useEffect(() => {
    const startRandomGlitch = () => {
      setIsGlitching(true);
      // Stop glitching after a short duration
      glitchTimeoutRef.current = setTimeout(() => {
        setIsGlitching(false);
        // Schedule next glitch
        const nextGlitchDelay = 3000 + Math.random() * 7000; // 3-10 seconds
        setTimeout(startRandomGlitch, nextGlitchDelay);
      }, 150 + Math.random() * 200); // Glitch for 150-350ms
    };
    // Start the first glitch after a delay
    const initialDelay = Math.random() * 5000;
    setTimeout(startRandomGlitch, initialDelay);
    return () => {
      if (glitchTimeoutRef.current) {
        clearTimeout(glitchTimeoutRef.current);
      }
    };
  }, []);
  return (
    <span className={`${className} relative inline-block`}>
      {/* Original text - ALWAYS visible with highest priority */}
      <span 
        className="relative z-50 font-bold"
        style={{ 
          position: 'relative',
          zIndex: 50,
          display: 'inline-block'
        }}
      >
        {children}
      </span>
      {/* Pure visual glitch effects - behind the main text */}
      {isGlitching && (
        <>
          {/* Red ghost layer */}
          <span 
            className="absolute inset-0 text-red-500 opacity-20 animate-pulse pointer-events-none"
            style={{
              transform: 'translateX(1px) translateY(-0.5px)',
              filter: 'blur(0.5px)',
              zIndex: 1
            }}
          >
            {children}
          </span>
          {/* Cyan ghost layer */}
          <span 
            className="absolute inset-0 text-cyan-400 opacity-15 animate-pulse pointer-events-none"
            style={{
              transform: 'translateX(-1px) translateY(0.5px)',
              filter: 'blur(0.3px)',
              zIndex: 2
            }}
          >
            {children}
          </span>
        </>
      )}
    </span>
  );
}
// Simple alternative that just adds basic glow without any text effects
export function SimpleLogoGlow({ children, className = "" }: { children: string; className?: string }) {
  return (
    <span 
      className={`${className} relative inline-block`}
      style={{
        textShadow: '0 0 10px rgba(16, 185, 129, 0.3), 0 0 20px rgba(59, 130, 246, 0.2), 0 0 30px rgba(147, 51, 234, 0.1)'
      }}
    >
      {children}
    </span>
  );
}
// Constant glitch effect with character corruption for logo
export function ConstantGlitchLogo({ children, className = "" }: { children: string; className?: string }) {
  const [displayText, setDisplayText] = React.useState(children);
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const glitchChars = [
    '!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '-', '_', '=', '+',
    '[', ']', '{', '}', '|', '\\', ':', ';', '"', "'", '<', '>', ',', '.', 
    '?', '/', '~', '`', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
    '█', '▓', '▒', '░', '▄', '▀', '■', '□', '▪', '▫', '◆', '◇', '○', '●',
    '★', '☆', '♠', '♣', '♥', '♦', '♪', '♫', '♦', '♣', '♠', '♥',
    'Ω', 'Φ', 'Ψ', 'Δ', 'Λ', 'Π', 'Σ', 'Θ', 'Ξ', 'α', 'β', 'γ', 'δ', 'ε'
  ];
  const glitchText = React.useCallback((text: string) => {
    const chars = text.split('');
    const glitchedChars = chars.map(char => {
      if (Math.random() < 0.15) {
        return glitchChars[Math.floor(Math.random() * glitchChars.length)];
      }
      return char;
    });
    return glitchedChars.join('');
  }, []);
  React.useEffect(() => {
    const startGlitching = () => {
      intervalRef.current = setInterval(() => {
        setDisplayText(glitchText(children));
        setTimeout(() => {
          setDisplayText(children);
        }, 150 + Math.random() * 150); 
      }, 800 + Math.random() * 700); 
    };
    startGlitching();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [children, glitchText]);
  return (
    <span className={`${className} relative inline-block font-mono`}>
      <span 
        className="absolute inset-0 text-white/20"
        style={{ zIndex: 1 }}
      >
        {children}
      </span>
      <span 
        className="relative text-white"
        style={{ 
          zIndex: 10,
          textShadow: '0 0 5px rgba(255, 0, 0, 0.5), 0 0 10px rgba(0, 255, 255, 0.3)'
        }}
      >
        {displayText}
      </span>
    </span>
  );
}
export function IntenseGlitchText({ children, className = "" }: { children: string; className?: string }) {
  return (
    <GlitchText 
      className={className}
      glitchIntensity={0.5}
      changeSpeed={20}
      constantGlitch={true}
    >
      {children}
    </GlitchText>
  );
}
export function SubtleGlitchText({ children, className = "" }: { children: string; className?: string }) {
  return (
    <GlitchText 
      className={className}
      glitchIntensity={0.1}
      changeSpeed={100}
      constantGlitch={false}
    >
      {children}
    </GlitchText>
  );
}