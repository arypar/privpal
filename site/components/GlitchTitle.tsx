"use client"
import React, { useState, useEffect } from 'react';
interface GlitchTitleProps {
  children: string;
  className?: string;
}
export function GlitchTitle({ children, className = "" }: GlitchTitleProps) {
  const [isGlitching, setIsGlitching] = useState(false);
  const [displayText, setDisplayText] = useState(children);
  useEffect(() => {
    const glitchInterval = setInterval(() => {
      if (Math.random() < 0.1) { 
        setIsGlitching(true);
        const glitchChars = '!@#$%^&*(){}[]|\\:";\'<>?,./~`';
        const originalText = children;
        let glitchedText = '';
        for (let i = 0; i < originalText.length; i++) {
          if (Math.random() < 0.3) {
            glitchedText += glitchChars[Math.floor(Math.random() * glitchChars.length)];
          } else {
            glitchedText += originalText[i];
          }
        }
        setDisplayText(glitchedText);
        setTimeout(() => {
          setDisplayText(originalText);
          setIsGlitching(false);
        }, 150);
      }
    }, 2000 + Math.random() * 3000);
    return () => clearInterval(glitchInterval);
  }, [children]);
  return (
    <h1 className={`relative ${className}`}>
      <span className={`${isGlitching ? 'animate-bounce' : ''} transition-all duration-150`}>
        {displayText}
      </span>
      {isGlitching && (
        <>
          <span 
            className="absolute inset-0 text-red-500 opacity-70 animate-ping"
            style={{ transform: 'translateX(2px)' }}
          >
            {children}
          </span>
          <span 
            className="absolute inset-0 text-blue-500 opacity-70 animate-ping"
            style={{ transform: 'translateX(-2px)' }}
          >
            {children}
          </span>
          <span 
            className="absolute inset-0 text-green-500 opacity-40 animate-pulse"
            style={{ transform: 'translateY(1px)' }}
          >
            {children}
          </span>
        </>
      )}
      <div className={`absolute inset-0 pointer-events-none ${isGlitching ? 'opacity-30' : 'opacity-0'} transition-opacity duration-150`}>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/20 to-transparent animate-pulse" 
             style={{ 
               backgroundSize: '100% 4px',
               backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(6, 182, 212, 0.1) 2px, rgba(6, 182, 212, 0.1) 4px)'
             }}>
        </div>
      </div>
    </h1>
  );
}