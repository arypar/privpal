"use client";
import WalletProvider from "../../components/wallet-provider";
import NavigationHeader from "@/components/NavigationHeader";
import { MerkleProofVerifier } from "@/components/MerkleProofVerifier";
import { ConstantGlitchLogo } from "@/components/GlitchText";
export default function VerifyPage() {
  return (
    <WalletProvider>
      <div className="grid grid-rows-[auto_1fr_auto] min-h-screen px-4 sm:px-1 font-[family-name:var(--font-geist-sans)] bg-black">
        <NavigationHeader />
        <div className="flex flex-col items-center justify-center space-y-6 py-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold mb-2 text-white">
              <ConstantGlitchLogo>Merkle Proof Verification</ConstantGlitchLogo>
            </h1>
            <p className="text-gray-300">
              <ConstantGlitchLogo>Verify your balance in the merkle tree and generate withdrawal proofs</ConstantGlitchLogo>
            </p>
          </div>
          <MerkleProofVerifier />
        </div>
      </div>       
    </WalletProvider>
  );
}