"use client"
import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
const MOCK_ERC20_ABI = [
  {"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"}
] as const;
const CONTRACT_ABI = [
  {"inputs":[],"name":"pyusdToken","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"}
] as const;
const CONTRACT_ADDRESS = "0x8461Ca63fBc0532beD991279A585a0b8e21D3184" as const;
interface AnimatedCounterProps {
  value: number;
  duration?: number;
}
function AnimatedCounter({ value, duration = 1000 }: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  useEffect(() => {
    if (value === displayValue) return;
    setIsAnimating(true);
    const startValue = displayValue;
    const difference = value - startValue;
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (difference * easeOutCubic);
      setDisplayValue(currentValue);
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };
    requestAnimationFrame(animate);
  }, [value, displayValue, duration]);
  return (
    <span className={`transition-all duration-300 ${isAnimating ? 'text-green-400 scale-110' : ''}`}>
      {displayValue.toFixed(2)}
    </span>
  );
}
function GlitchText({ children, isGlitching }: { children: React.ReactNode; isGlitching?: boolean }) {
  const [glitchActive, setGlitchActive] = useState(false);
  useEffect(() => {
    if (!isGlitching) return;
    const interval = setInterval(() => {
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 150);
    }, 2000 + Math.random() * 3000);
    return () => clearInterval(interval);
  }, [isGlitching]);
  return (
    <span className={`relative ${glitchActive ? 'animate-pulse' : ''}`}>
      {glitchActive && (
        <>
          <span className="absolute inset-0 text-red-500 animate-ping opacity-75 transform translate-x-1">
            {children}
          </span>
          <span className="absolute inset-0 text-blue-500 animate-ping opacity-75 transform -translate-x-1">
            {children}
          </span>
        </>
      )}
      <span className={glitchActive ? 'animate-bounce' : ''}>{children}</span>
    </span>
  );
}
export function AnimatedBalance() {
  const { address: userAddress, isConnected } = useAccount();
  const [previousBalance, setPreviousBalance] = useState(0);
  const { data: pyusdTokenAddress } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'pyusdToken',
  });
  const { data: userBalance, refetch: refetchBalance } = useReadContract({
    address: pyusdTokenAddress,
    abi: MOCK_ERC20_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
  });
  const balanceFormatted = userBalance ? parseFloat(formatUnits(userBalance, 6)) : 0;
  useEffect(() => {
    if (balanceFormatted !== previousBalance) {
      setPreviousBalance(balanceFormatted);
    }
  }, [balanceFormatted, previousBalance]);
  useEffect(() => {
    const interval = setInterval(() => {
      if (refetchBalance) {
        refetchBalance();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [refetchBalance]);
  if (!isConnected) {
    return (
      <div className="relative bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 mb-6 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-2xl blur-xl"></div>
        <div className="relative">
          <div className="text-center">
            <div className="text-slate-400 text-sm mb-2">💳 Wallet Status</div>
            <div className="text-red-400 font-mono text-lg">
              <GlitchText isGlitching>DISCONNECTED</GlitchText>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="relative bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 mb-6 shadow-2xl">
      <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 via-blue-500/20 to-purple-500/20 rounded-2xl blur-xl animate-pulse"></div>
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
            <span className="text-slate-400 text-sm font-medium">PYUSD Balance</span>
          </div>
          <button
            onClick={() => refetchBalance?.()}
            className="text-slate-400 hover:text-green-400 transition-colors duration-300 transform hover:rotate-180"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        <div className="text-center">
          <div className="text-4xl font-bold font-mono mb-2">
            <GlitchText isGlitching={balanceFormatted > previousBalance}>
              <span className="bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                $<AnimatedCounter value={balanceFormatted} />
              </span>
            </GlitchText>
          </div>
          <div className="text-sm text-slate-400 font-mono">
            {userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : 'No address'}
          </div>
          {balanceFormatted > previousBalance && (
            <div className="mt-2 text-green-400 text-sm animate-bounce">
              ↗️ Balance increased!
            </div>
          )}
        </div>
        <div className="absolute -top-2 -right-2 text-green-400/30 text-xs animate-spin">⬢</div>
        <div className="absolute -bottom-2 -left-2 text-blue-400/30 text-xs animate-bounce">◊</div>
        <div className="absolute top-1/2 -right-4 text-purple-400/30 text-xs animate-pulse">⟐</div>
      </div>
    </div>
  );
}