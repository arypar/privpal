"use client"
import React, { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';

interface FloatingLogo {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  size: number;
  duration: number;
  opacity: number;
  rotation: number;
  spawning: boolean;
  despawning: boolean;
  lifespan: number;
  age: number;
}

export function FloatingLogos() {
  const [logos, setLogos] = useState<FloatingLogo[]>([]);
  const [nextId, setNextId] = useState(0);

  const createRandomLogo = useCallback((id: number): FloatingLogo => {
    return {
      id,
      x: Math.random() * 100,
      y: Math.random() * 100,
      targetX: Math.random() * 100,
      targetY: Math.random() * 100,
      size: Math.random() * 40 + 20,
      duration: Math.random() * 10 + 8,
      opacity: 0,
      rotation: Math.random() * 360,
      spawning: true,
      despawning: false,
      lifespan: Math.random() * 15000 + 10000, // 10-25 seconds
      age: 0,
    };
  }, []);

  useEffect(() => {
    // Initial spawn of logos
    const initialLogos: FloatingLogo[] = [];
    for (let i = 0; i < 8; i++) {
      initialLogos.push(createRandomLogo(i));
    }
    setLogos(initialLogos);
    setNextId(8);
  }, [createRandomLogo]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLogos(prevLogos => {
        return prevLogos.map(logo => {
          const newAge = logo.age + 100;
          let newLogo = { ...logo, age: newAge };

          // Handle spawning phase
          if (logo.spawning && logo.opacity < 0.15) {
            newLogo.opacity = Math.min(0.15, logo.opacity + 0.005);
            if (newLogo.opacity >= 0.15) {
              newLogo.spawning = false;
            }
          }

          // Handle despawning phase
          if (logo.despawning && logo.opacity > 0) {
            newLogo.opacity = Math.max(0, logo.opacity - 0.01);
          }

          // Start despawning when lifespan is reached
          if (!logo.despawning && newAge >= logo.lifespan) {
            newLogo.despawning = true;
          }

          // Move towards target, then pick new target
          const deltaX = logo.targetX - logo.x;
          const deltaY = logo.targetY - logo.y;
          const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

          if (distance < 5) {
            // Pick new target
            newLogo.targetX = Math.random() * 100;
            newLogo.targetY = Math.random() * 100;
          } else {
            // Move towards target
            const speed = 0.02; // Speed of movement
            newLogo.x = logo.x + (deltaX * speed);
            newLogo.y = logo.y + (deltaY * speed);
          }

          // Slowly rotate
          newLogo.rotation = (logo.rotation + 0.2) % 360;

          return newLogo;
        }).filter(logo => logo.opacity > 0); // Remove fully faded logos
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Spawn new logos randomly
    const spawnInterval = setInterval(() => {
      setLogos(prevLogos => {
        if (prevLogos.length < 12 && Math.random() < 0.3) {
          const newLogo = createRandomLogo(nextId);
          setNextId(prev => prev + 1);
          return [...prevLogos, newLogo];
        }
        return prevLogos;
      });
    }, 2000);

    return () => clearInterval(spawnInterval);
  }, [createRandomLogo, nextId]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {logos.map((logo) => (
        <div
          key={logo.id}
          className="absolute transition-all duration-100 ease-linear"
          style={{
            left: `${logo.x}%`,
            top: `${logo.y}%`,
            opacity: logo.opacity,
            transform: `translate(-50%, -50%)`,
          }}
        >
          <div
            className="relative transform-gpu"
            style={{
              width: `${logo.size}px`,
              height: `${logo.size}px`,
              transform: `rotate(${logo.rotation}deg) scale(${logo.spawning ? 0.8 : logo.despawning ? 1.2 : 1})`,
              transition: 'transform 0.3s ease-out',
            }}
          >
            <Image
              src="/27772.png"
              alt="PayPal Logo"
              width={logo.size}
              height={logo.size}
              className={`object-contain transition-all duration-500 ${
                logo.spawning ? 'filter blur-sm' : 
                logo.despawning ? 'filter blur-lg' : 
                'filter blur-[0.5px]'
              }`}
            />
          </div>
        </div>
      ))}
    </div>
  );
} 