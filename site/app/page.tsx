"use client";
import WalletProvider from "../components/wallet-provider";
import NavigationHeader from "@/components/NavigationHeader";
import { SendTransaction } from "@/components/SendTransaction";
import { GlitchTitle } from "@/components/GlitchTitle";
import { ConstantGlitchLogo } from "@/components/GlitchText";
import { MerkleRecomputeIndicator } from "@/components/MerkleRecomputeIndicator";
export default function Home() {
  return (
    <WalletProvider>
      <div className="relative min-h-screen bg-black">
        <div className="relative z-10 grid grid-rows-[auto_1fr_auto] min-h-screen px-4 sm:px-1 font-[family-name:var(--font-geist-sans)]">
          <NavigationHeader />
          <div className="flex flex-col items-center justify-center space-y-6 py-8">
            <div className="text-center mb-8">
              <div className="text-5xl font-bold text-white mb-4">
                <ConstantGlitchLogo>PrivPal</ConstantGlitchLogo>
              </div>
              <p className="text-xl text-slate-300 max-w-2xl mx-auto">
                <ConstantGlitchLogo>Anonymous payments powered by zero-knowledge cryptography and merkle tree privacy</ConstantGlitchLogo>
              </p>
              <div className="mt-4 flex justify-center space-x-4 text-sm text-slate-400">
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  <ConstantGlitchLogo>Zero-Knowledge</ConstantGlitchLogo>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                  <ConstantGlitchLogo>Merkle Trees</ConstantGlitchLogo>
                </span>
              </div>
            </div>
            
            {/* Spectacular Merkle Recompute Indicator */}
            <div className="w-full max-w-4xl">
              <MerkleRecomputeIndicator className="mb-8" />
            </div>
            
            <SendTransaction />
          </div>
        </div>
      </div>       
    </WalletProvider>
  );
}