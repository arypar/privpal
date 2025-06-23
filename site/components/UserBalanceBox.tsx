"use client";
import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { GlitchText, ConstantGlitchLogo } from '@/components/GlitchText';
import { useToast } from '@/components/ui/use-toast';

interface UserBalanceBoxProps {
  className?: string;
}

interface BalanceData {
  success: boolean;
  data: {
    address: string;
    balance: number;
    nonce: number;
    timestamp: string;
  };
}

export function UserBalanceBox({ className = "" }: UserBalanceBoxProps) {
  const [balance, setBalance] = useState<number>(0);
  const [nonce, setNonce] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { address: userAddress, isConnected } = useAccount();
  const { toast } = useToast();

  const fetchBalance = async (showRefreshAnimation = false) => {
    if (!userAddress || !isConnected) {
      setBalance(0);
      setNonce(0);
      return;
    }

    try {
      if (showRefreshAnimation) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const response = await fetch(`http://localhost:3001/api/users/${userAddress}/balance`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch balance: ${response.statusText}`);
      }

      const data: BalanceData = await response.json();
      console.log('API Response:', data); // Debug log
      setBalance(data.data.balance || 0);
      setNonce(data.data.nonce || 0);

      if (showRefreshAnimation) {
        toast({
          variant: "success",
          title: "Balance Refreshed! 🔄",
          description: "Updated balance: " + (data.data.balance || 0) + " PYUSD",
        });
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
      toast({
        variant: "error",
        title: "Failed to fetch balance",
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
      setBalance(0);
      setNonce(0);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Fetch balance on mount and when address changes
  useEffect(() => {
    fetchBalance();
  }, [userAddress, isConnected]);

  // Auto-refresh balance every 1 second for real-time updates
  useEffect(() => {
    if (!isConnected || !userAddress) return;

    const interval = setInterval(() => {
      fetchBalance();
    }, 1000); // 1 second

    return () => clearInterval(interval);
  }, [userAddress, isConnected]);

  // Listen for manual refresh events from other components
  useEffect(() => {
    const handleRefresh = () => {
      fetchBalance(true); // Show refresh animation
    };

    window.addEventListener('refreshUserBalance', handleRefresh);
    return () => window.removeEventListener('refreshUserBalance', handleRefresh);
  }, []);



  const formatBalance = (balance: number) => {
    return balance.toFixed(2);
  };

  if (!isConnected) {
    return (
      <div className={`${className} border border-slate-800/50 rounded-lg bg-gradient-to-br from-slate-900/50 to-black/30 backdrop-blur-sm p-4`}>
        <div className="text-center text-slate-400">
          <GlitchText glitchIntensity={0.05}>
            Connect wallet to view balance
          </GlitchText>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} border border-slate-800/50 rounded-lg bg-gradient-to-br from-slate-900/50 to-black/30 backdrop-blur-sm relative overflow-hidden`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-800/50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            <GlitchText glitchIntensity={0.1} changeSpeed={80}>
              Your Deposited Balance
            </GlitchText>
          </h3>
          <div className={`px-3 py-1 rounded-full text-xs font-mono transition-all duration-300 ${
            isLoading || isRefreshing
              ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50' 
              : 'bg-green-500/20 text-green-400 border border-green-500/30'
          }`}>
            {isLoading || isRefreshing ? (
              <ConstantGlitchLogo>SYNCING</ConstantGlitchLogo>
            ) : (
              <GlitchText glitchIntensity={0.05}>SYNCED</GlitchText>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Balance Display */}
        <div className="text-center">
          <div className="text-3xl font-bold mb-2">
            {isLoading ? (
              <GlitchText constantGlitch={true} glitchIntensity={0.3} className="text-slate-400">
                LOADING...
              </GlitchText>
            ) : (
              <span className="text-green-400">
                <GlitchText glitchIntensity={0.05}>
                  {formatBalance(balance) + " PYUSD"}
                </GlitchText>
              </span>
            )}
          </div>
          <div className="text-sm text-slate-400">
            Available for anonymous transfers
          </div>
        </div>

        {/* Balance Details */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <div className="text-slate-500">Address:</div>
            <div className="text-slate-300 font-mono break-all">
              <GlitchText glitchIntensity={0.01}>
                {userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : ''}
              </GlitchText>
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-slate-500">Nonce:</div>
            <div className="text-slate-300 font-mono">
              <GlitchText glitchIntensity={0.01}>
                {"#" + nonce}
              </GlitchText>
            </div>
          </div>
        </div>

        {/* Balance Status */}


        {/* Quick Actions Hint */}
        {balance > 0 && (
          <div className="text-xs text-slate-500 text-center border-t border-slate-800/50 pt-3">
          </div>
        )}
      </div>

      {/* Loading/Refreshing Overlay */}
      {(isLoading || isRefreshing) && (
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-slate-500/5 to-blue-600/5 animate-pulse pointer-events-none" />
      )}
    </div>
  );
} 