"use client"
import React from 'react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ConstantGlitchLogo } from '@/components/GlitchText';
const NavigationHeader: React.FC = () => {
  return (
    <header className="w-full bg-background border-b border-border backdrop-blur-md">
      <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-white hover:scale-105 transition-transform duration-300 relative group">
          <ConstantGlitchLogo className="relative z-10">PrivPal</ConstantGlitchLogo>
        </Link>
        <ul className="flex space-x-4 items-center">
          <li>
            <Link href="/" className="hover:text-blue-600 transition-all duration-300 transform hover:scale-110 relative group">
              <ConstantGlitchLogo className="relative z-10">🏠 Home</ConstantGlitchLogo>
              <div className="absolute inset-0 bg-blue-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 -m-2"></div>
            </Link>
          </li>
          <li>
            <Link href="/verify" className="hover:text-blue-600 transition-all duration-300 transform hover:scale-110 relative group">
              <ConstantGlitchLogo className="relative z-10">🔍 Verify</ConstantGlitchLogo>
              <div className="absolute inset-0 bg-blue-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 -m-2"></div>
            </Link>
          </li>
          <li className="relative group">
            <div className="transition-all duration-300 transform group-hover:scale-105">
              <ConnectButton />
            </div>
            <div className="absolute inset-0 border border-green-400/0 group-hover:border-green-400/30 rounded-lg transition-all duration-300 animate-pulse pointer-events-none"></div>
          </li>
        </ul>
      </nav>
    </header>
  );
};
export default NavigationHeader;