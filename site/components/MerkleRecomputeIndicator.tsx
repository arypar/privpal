"use client"

import React, { useState, useEffect } from 'react';
import { useReadContract, useAccount } from 'wagmi';
import { GlitchText, ConstantGlitchLogo } from '@/components/GlitchText';

// Contract ABI and address from SendTransaction component
const CONTRACT_ABI = [
  {"inputs":[{"internalType":"address","name":"_pyusdTokenAddress","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"timestamp","type":"uint256"}],"name":"Deposit","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":false,"internalType":"bytes32","name":"newRoot","type":"bytes32"}],"name":"RootUpdated","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"nonce","type":"uint256"}],"name":"Withdrawn","type":"event"},
  {"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"depositPyusd","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"user","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"nonce","type":"uint256"}],"name":"generateLeaf","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"pure","type":"function"},
  {"inputs":[],"name":"getContractBalance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"user","type":"address"},{"internalType":"uint256","name":"nonce","type":"uint256"}],"name":"isNullifierUsed","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"merkleRoot","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"pyusdToken","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"bytes32","name":"newRoot","type":"bytes32"}],"name":"updateRoot","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"name":"usedNullifiers","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"bytes32","name":"leaf","type":"bytes32"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"nonce","type":"uint256"}],"name":"validateLeaf","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"bytes32[]","name":"proof","type":"bytes32[]"},{"internalType":"bytes32","name":"root","type":"bytes32"},{"internalType":"bytes32","name":"leaf","type":"bytes32"}],"name":"verifyMerkleProof","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"pure","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"bytes32[]","name":"merkleProof","type":"bytes32[]"},{"internalType":"bytes32","name":"leaf","type":"bytes32"}],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"}
] as const;

const CONTRACT_ADDRESS = "0x8461Ca63fBc0532beD991279A585a0b8e21D3184" as const;

interface MerkleRecomputeIndicatorProps {
  className?: string;
}

export function MerkleRecomputeIndicator({ className = "" }: MerkleRecomputeIndicatorProps) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRecomputing, setIsRecomputing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const { isConnected } = useAccount();

  // Read the actual merkle root from the smart contract
  const { data: merkleRoot, refetch: refetchMerkleRoot } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'merkleRoot',
  });

  // Get contract balance for additional info
  const { data: contractBalance } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getContractBalance',
  });

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const seconds = now.getSeconds();
      
      // Calculate time left until next :15 second mark (60 seconds cycle)
      let timeLeft;
      if (seconds < 15) {
        // Before :15, count down to :15 of current minute
        timeLeft = 15 - seconds;
      } else {
        // After :15, count down to :15 of next minute (max 60 seconds)
        timeLeft = (60 + 15) - seconds;
      }
      setTimeLeft(timeLeft);
      
      // Trigger recompute at :15 seconds (when seconds = 15)
      if (seconds === 15) {
        setIsRecomputing(true);
        setLastUpdate(now);
        refetchMerkleRoot(); // Refresh the merkle root
        
        // Stop recomputing after 3 seconds
        setTimeout(() => {
          setIsRecomputing(false);
        }, 3000);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [refetchMerkleRoot]);

  const formatMerkleRoot = (root: string | undefined) => {
    if (!root || typeof root !== 'string') return "0x0000000000000000000000000000000000000000000000000000000000000000";
    return root; // Return the full hash without truncation
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className={`${className} relative overflow-hidden border border-slate-800/50 rounded-lg bg-gradient-to-br from-slate-900/50 to-black/30 backdrop-blur-sm`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-800/50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            <GlitchText glitchIntensity={0.1} changeSpeed={80}>
              Merkle Tree Status
            </GlitchText>
          </h3>
          <div className={`px-3 py-1 rounded-full text-xs font-mono transition-all duration-300 ${
            isRecomputing 
              ? 'bg-orange-600/30 text-orange-300 border border-red-500/50' 
              : 'bg-green-500/20 text-green-400 border border-green-500/30'
          }`}>
            {isRecomputing ? (
              <ConstantGlitchLogo>RECOMPUTING</ConstantGlitchLogo>
            ) : (
              <GlitchText glitchIntensity={0.05}>SYNCED</GlitchText>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Countdown Timer */}
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-sm">Next Recompute:</span>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${
              timeLeft <= 10 ? 'bg-orange-500' : 'bg-blue-400'
            }`}></div>
            <span className="font-mono text-lg text-white">
              {isRecomputing ? (
                <GlitchText constantGlitch={true} glitchIntensity={0.3}>
                  COMPUTING...
                </GlitchText>
              ) : (
                <GlitchText glitchIntensity={0.02}>
                  {Math.floor(timeLeft) + "s"}
                </GlitchText>
              )}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
                 <div className="w-full bg-slate-800/50 rounded-full h-2 overflow-hidden">
           <div 
             className={`h-full transition-all duration-1000 ${
               isRecomputing 
                 ? 'bg-gradient-to-r from-orange-600 via-red-500 to-orange-600 animate-pulse'
                 : 'bg-gradient-to-r from-blue-500 to-green-500'
             }`}
             style={{ width: `${((60 - timeLeft) / 60) * 100}%` }}
           />
         </div>

        {/* Merkle Root Display */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">Current Root:</span>
            {isConnected && (
              <span className="text-xs text-green-400">LIVE</span>
            )}
          </div>
          <div 
            className="font-mono text-sm bg-slate-800/30 rounded p-3 border border-slate-700/50 cursor-pointer hover:bg-slate-800/50 transition-colors group"
            onClick={() => merkleRoot && copyToClipboard(merkleRoot)}
            title="Click to copy full hash"
          >
            {isRecomputing ? (
              <GlitchText constantGlitch={true} glitchIntensity={0.4} className="text-orange-500 font-bold">
                {formatMerkleRoot(merkleRoot)}
              </GlitchText>
            ) : (
              <span className="text-slate-300 group-hover:text-white transition-colors break-all">
                <GlitchText glitchIntensity={0.01}>
                  {formatMerkleRoot(merkleRoot)}
                </GlitchText>
              </span>
            )}
          </div>
        </div>

        {/* Additional Info */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <div className="text-slate-500">Network:</div>
            <div className="text-slate-300">
              <GlitchText glitchIntensity={0.01}>Ethereum Sepolia</GlitchText>
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-slate-500">Pool Balance:</div>
            <div className="text-slate-300">
              <GlitchText glitchIntensity={0.01}>
                {contractBalance ? `${Number(contractBalance) / 1e6} PYUSD` : '0 PYUSD'}
              </GlitchText>
            </div>
          </div>
        </div>

        {lastUpdate && (
          <div className="text-xs text-slate-500 border-t border-slate-800/50 pt-2">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
        )}
      </div>

             {/* Recomputing Overlay Effect */}
       {isRecomputing && (
         <div className="absolute inset-0 bg-gradient-to-r from-orange-600/10 via-red-500/10 to-orange-600/10 animate-pulse pointer-events-none" />
       )}
    </div>
  );
} 