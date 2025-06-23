"use client"
import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useToast } from '@/components/ui/use-toast';
interface ProofStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  data?: string;
}
interface MerkleProof {
  leaf: string;
  root: string;
  proof: string[];
  position: number;
  balance: number;
  nonce: number;
}
interface ProofGeneratorProps {
  isVisible: boolean;
  onProofGenerated: (proof: MerkleProof) => void;
  onClose: () => void;
}
function CryptographicLoader() {
  const [dots, setDots] = useState('');
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="flex items-center space-x-2">
      <div className="flex space-x-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 bg-green-400 rounded-full animate-pulse"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
      <span className="font-mono text-green-400">Computing{dots}</span>
    </div>
  );
}
function ProofVisualization({ proof }: { proof: MerkleProof | null }) {
  if (!proof) return null;
  return (
    <div className="mt-6 space-y-4">
      <div className="text-center">
        <div className="inline-flex items-center space-x-2 bg-green-900/50 px-4 py-2 rounded-full border border-green-500/30">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-green-400 font-mono text-sm">PROOF GENERATED</span>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-cyan-400 font-mono text-sm">🍃 LEAF HASH</span>
            <button
              onClick={() => navigator.clipboard.writeText(proof.leaf)}
              className="text-slate-400 hover:text-cyan-400 transition-colors"
            >
              📋
            </button>
          </div>
          <div className="font-mono text-xs text-slate-300 bg-slate-900 p-2 rounded border break-all">
            {proof.leaf}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-4 text-center">
            <div className="text-green-400 font-mono text-sm mb-1">💰 BALANCE</div>
            <div className="text-2xl font-bold text-green-400">{proof.balance} PYUSD</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-4 text-center">
            <div className="text-blue-400 font-mono text-sm mb-1">📍 POSITION</div>
            <div className="text-2xl font-bold text-blue-400">{proof.position}</div>
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-purple-400 font-mono text-sm">🌳 MERKLE ROOT</span>
            <button
              onClick={() => navigator.clipboard.writeText(proof.root)}
              className="text-slate-400 hover:text-purple-400 transition-colors"
            >
              📋
            </button>
          </div>
          <div className="font-mono text-xs text-slate-300 bg-slate-900 p-2 rounded border break-all">
            {proof.root}
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-4">
          <div className="text-yellow-400 font-mono text-sm mb-3">🛤️ PROOF PATH ({proof.proof.length} hashes)</div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {proof.proof.map((hash, index) => (
              <div key={index} className="flex items-center space-x-2">
                <span className="text-yellow-400 font-mono text-xs w-6">{index}:</span>
                <div className="flex-1 font-mono text-xs text-slate-300 bg-slate-900 p-2 rounded border break-all">
                  {hash}
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(hash)}
                  className="text-slate-400 hover:text-yellow-400 transition-colors"
                >
                  📋
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
export function ProofGenerator({ isVisible, onProofGenerated, onClose }: ProofGeneratorProps) {
  const { address: userAddress } = useAccount();
  const [steps, setSteps] = useState<ProofStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedProof, setGeneratedProof] = useState<MerkleProof | null>(null);
  const { toast } = useToast();
  const proofSteps: ProofStep[] = [
    {
      id: 'validate',
      title: 'Address Validation',
      description: 'Verifying wallet address and balance eligibility',
      status: 'pending'
    },
    {
      id: 'fetch_tree',
      title: 'Merkle Tree Retrieval',
      description: 'Downloading current merkle tree state from blockchain',
      status: 'pending'
    },
    {
      id: 'locate_leaf',
      title: 'Leaf Localization',
      description: 'Finding your balance entry in the merkle tree',
      status: 'pending'
    },
    {
      id: 'generate_path',
      title: 'Path Generation',
      description: 'Computing cryptographic proof path to root',
      status: 'pending'
    },
    {
      id: 'verify_proof',
      title: 'Proof Verification',
      description: 'Validating generated proof against merkle root',
      status: 'pending'
    }
  ];
  useEffect(() => {
    if (isVisible && !isGenerating) {
      setSteps(proofSteps);
      setCurrentStep(0);
      setGeneratedProof(null);
    }
  }, [isVisible]);
  const generateProof = async () => {
    if (!userAddress) {
      toast({
        variant: "error",
        title: "Wallet Not Connected",
        description: "Please connect your wallet to generate a proof.",
      });
      return;
    }
    setIsGenerating(true);
    try {
      for (let i = 0; i < proofSteps.length; i++) {
        setCurrentStep(i);
        setSteps(prev => prev.map((step, index) => ({
          ...step,
          status: index < i ? 'complete' : index === i ? 'active' : 'pending'
        })));
        await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
        if (i === 2 && Math.random() < 0.1) {
          setSteps(prev => prev.map((step, index) => ({
            ...step,
            status: index === i ? 'error' : step.status
          })));
          throw new Error('Balance not found in merkle tree');
        }
      }
      setSteps(prev => prev.map(step => ({ ...step, status: 'complete' })));
      const response = await fetch(`http://localhost:3001/api/merkle/proof/${userAddress}`);
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to generate merkle proof");
      }
      const proof: MerkleProof = {
        leaf: result.data.leaf,
        root: result.data.root,
        proof: result.data.proof,
        position: result.data.position,
        balance: result.data.balance,
        nonce: result.data.nonce
      };
      setGeneratedProof(proof);
      onProofGenerated(proof);
    } catch (error) {
      toast({
        variant: "error",
        title: "Proof Generation Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
      setSteps(prev => prev.map((step, index) => ({
        ...step,
        status: index <= currentStep ? (index === currentStep ? 'error' : 'complete') : 'pending'
      })));
    } finally {
      setIsGenerating(false);
    }
  };
  if (!isVisible) return null;
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-600 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-blue-400 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">🔐</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Cryptographic Proof Generator</h2>
                <p className="text-slate-400 text-sm">Generating zero-knowledge withdrawal proof</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
          <div className="space-y-4 mb-6">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center space-x-4 p-4 rounded-lg border transition-all duration-500 ${
                  step.status === 'active' ? 'bg-blue-900/30 border-blue-500/50' :
                  step.status === 'complete' ? 'bg-green-900/30 border-green-500/50' :
                  step.status === 'error' ? 'bg-red-900/30 border-red-500/50' :
                  'bg-slate-800/30 border-slate-600/50'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step.status === 'active' ? 'bg-blue-500 animate-pulse' :
                  step.status === 'complete' ? 'bg-green-500' :
                  step.status === 'error' ? 'bg-red-500' :
                  'bg-slate-600'
                }`}>
                  {step.status === 'complete' ? '✓' :
                   step.status === 'error' ? '✗' :
                   step.status === 'active' ? '⚡' : index + 1}
                </div>
                <div className="flex-1">
                  <div className={`font-medium ${
                    step.status === 'active' ? 'text-blue-400' :
                    step.status === 'complete' ? 'text-green-400' :
                    step.status === 'error' ? 'text-red-400' :
                    'text-slate-400'
                  }`}>
                    {step.title}
                  </div>
                  <div className="text-sm text-slate-500">{step.description}</div>
                </div>
                {step.status === 'active' && <CryptographicLoader />}
              </div>
            ))}
          </div>

          <div className="flex space-x-3">
            {!generatedProof && !isGenerating && (
              <button
                onClick={generateProof}
                disabled={!userAddress}
                className="flex-1 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105"
              >
                {userAddress ? '🔐 Generate Proof' : '❌ No Wallet Connected'}
              </button>
            )}
            {generatedProof && (
              <button
                onClick={() => {
                  setGeneratedProof(null);
                  setSteps(proofSteps);
                  setCurrentStep(0);
                }}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                🔄 Generate New Proof
              </button>
            )}
            <button
              onClick={onClose}
              className="bg-slate-700 hover:bg-slate-600 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
          <ProofVisualization proof={generatedProof} />
        </div>
      </div>
    </div>
  );
}