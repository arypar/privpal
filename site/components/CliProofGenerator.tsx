"use client"
import React, { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
interface MerkleProof {
  leaf: string;
  root: string;
  proof: string[];
  position: number;
  balance: number;
  nonce: number;
}
interface CliProofGeneratorProps {
  isVisible: boolean;
  onProofGenerated: (proof: MerkleProof) => void;
  onClose: () => void;
}
interface CliLine {
  id: string;
  text: string;
  type: 'command' | 'output' | 'success' | 'error' | 'warning' | 'info';
  isTyping?: boolean;
  delay?: number;
  typed?: boolean;
}
export function CliProofGenerator({ isVisible, onProofGenerated, onClose }: CliProofGeneratorProps) {
  const { address: userAddress } = useAccount();
  const [lines, setLines] = useState<CliLine[]>([]);
  const [currentLine, setCurrentLine] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedProof, setGeneratedProof] = useState<MerkleProof | null>(null);
  const [showCursor, setShowCursor] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [waitingForTransaction, setWaitingForTransaction] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const interval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 400);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (overlayRef.current && event.target === overlayRef.current) {
        onClose();
      }
    };
    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible, onClose]);
  const getPrompt = () => {
    const timestamp = new Date().toLocaleTimeString();
    return `[${timestamp}] anon@privpal:~$ `;
  };
  const addLine = (text: string, type: CliLine['type'], delay = 0, isTyping = false) => {
    const newLine: CliLine = {
      id: Math.random().toString(36).substr(2, 9),
      text,
      type,
      delay,
      isTyping,
      typed: false
    };
    setLines(prev => [...prev, newLine]);
    return newLine.id;
  };
  const updateLineTyped = (id: string) => {
    setLines(prev => prev.map(line => 
      line.id === id ? { ...line, typed: true, isTyping: false } : line
    ));
  };
  const typeText = async (text: string, speed = 15) => {
    return new Promise<void>((resolve) => {
      let index = 0;
      const lineId = addLine('', 'output', 0, true);
      const typeInterval = setInterval(() => {
        if (index <= text.length) {
          setLines(prev => prev.map(line => 
            line.id === lineId ? { ...line, text: text.slice(0, index) } : line
          ));
          index++;
        } else {
          clearInterval(typeInterval);
          updateLineTyped(lineId);
          resolve();
        }
      }, speed);
    });
  };
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  const initializeTerminal = async () => {
    setLines([]);
    setIsGenerating(true);
    setIsComplete(false);
    setWaitingForTransaction(false);
    await sleep(100);
    addLine('╔════════════════════════════════════════════════════════════════╗', 'info');
    addLine('║                     PrivPal Secure Terminal v2.1             ║', 'info');
    addLine('║                   Zero-Knowledge Proof Generator              ║', 'info');
    addLine('╚════════════════════════════════════════════════════════════════╝', 'info');
    addLine('', 'output');
    await sleep(200);
    await typeText('🔗 Establishing secure connection to merkle tree network...', 12);
    await sleep(150);
    await typeText('✅ Connection established. Encryption: AES-256', 10);
    await sleep(100);
    await typeText(`🔐 Authenticated wallet: ${userAddress?.slice(0, 8)}...${userAddress?.slice(-6)}`, 10);
    await sleep(200);
    addLine('', 'output');
    addLine(getPrompt() + 'generate_merkle_proof --wallet=' + userAddress?.slice(0, 10) + '... --private', 'command');
    await sleep(300);
  };
  const generateProofSequence = async () => {
    await typeText('🕵️  Initiating anonymous proof generation protocol...', 8);
    await sleep(200);
    await typeText('📊 Scanning merkle tree for wallet balance...', 8);
    await sleep(300);
    await typeText('🔍 Searching 2,547 leaf nodes...', 8);
    await sleep(250);
    await typeText('⚡ Computing cryptographic proof path...', 8);
    await sleep(400);
    await typeText('🧮 Generating zero-knowledge proof components...', 8);
    await sleep(350);
    await typeText('🔐 Validating proof integrity...', 8);
    await sleep(300);
    try {
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
      await sleep(200);
      await typeText('✅ PROOF GENERATION COMPLETE!', 10);
      await sleep(150);
      addLine('', 'output');
      addLine('╔═══════════════ PROOF MANIFEST ═══════════════╗', 'success');
      await sleep(100);
      await typeText(`📍 Position in tree: ${proof.position}`, 8);
      await typeText(`💰 Verified balance: ${proof.balance} PYUSD`, 8);
      await typeText(`🔢 Nonce: ${proof.nonce}`, 8);
      await typeText(`🌳 Tree depth: ${proof.proof.length} levels`, 8);
      addLine('', 'output');
      await typeText('🍃 LEAF HASH:', 8);
      await typeText(proof.leaf, 5);
      addLine('', 'output');
      await typeText('🌳 MERKLE ROOT:', 8);
      await typeText(proof.root, 5);
      addLine('', 'output');
      await typeText('🛤️  PROOF PATH:', 8);
      for (let i = 0; i < proof.proof.length; i++) {
        await typeText(`[${i}] ${proof.proof[i]}`, 4);
        await sleep(50);
      }
      addLine('', 'output');
      addLine('╚═══════════════════════════════════════════════╝', 'success');
      await sleep(300);
      await typeText('🎯 Proof ready for blockchain submission.', 8);
      await typeText('⚠️  This proof can only be used once for security.', 8);
      addLine('', 'output');
      addLine(getPrompt() + 'execute_withdrawal --proof=generated --confirm', 'command');
      await sleep(200);
      await typeText('🚀 Ready to execute withdrawal transaction.', 8);
      await typeText('💡 Click EXECUTE WITHDRAWAL to proceed with transaction.', 8);
      setIsComplete(true);
      setWaitingForTransaction(true);
    } catch (error) {
      await sleep(200);
      await typeText('❌ ERROR: Failed to generate proof', 10);
      await typeText(`🔍 Details: ${error instanceof Error ? error.message : 'Unknown error'}`, 8);
      await typeText('🔄 Please try again or check your wallet connection.', 8);
      setIsComplete(true);
    } finally {
      setIsGenerating(false);
    }
  };
  const executeWithdrawal = async () => {
    if (!generatedProof) return;
    setWaitingForTransaction(false);
    addLine('', 'output');
    addLine(getPrompt() + 'submitting_transaction --silent', 'command');
    await sleep(100);
    await typeText('🔐 Preparing transaction with zero-knowledge proof...', 8);
    await typeText('📡 Broadcasting to blockchain network...', 8);
    await typeText('⏳ Waiting for network confirmation...', 8);
    onProofGenerated(generatedProof);
    await sleep(300);
    await typeText('✅ Transaction submitted successfully!', 8);
    await typeText('🎉 Withdrawal in progress. Check your wallet.', 8);
    addLine('', 'output');
    addLine(getPrompt() + 'exit', 'command');
    await sleep(400);
    await typeText('👋 Session terminated. Stay anonymous.', 10);
    setTimeout(() => {
      onClose();
    }, 1000);
  };
  useEffect(() => {
    if (isVisible && userAddress) {
      initializeTerminal().then(() => {
        generateProofSequence();
      });
    }
  }, [isVisible, userAddress]);
  if (!isVisible) return null;
  return (
    <div 
      ref={overlayRef}
      className="fixed inset-0 bg-black/20 backdrop-blur-md flex items-center justify-center z-50 p-4 cursor-pointer cli-backdrop"
      style={{ backdropFilter: 'blur(8px) saturate(180%)' }}
    >
      <div 
        className="cli-terminal border-2 border-green-500/50 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl shadow-green-500/25 relative terminal-flicker cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gray-900 border-b border-green-500/30 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            <span className="text-green-400 font-mono text-sm ml-4">
              PrivPal Terminal - Zero-Knowledge Proof Generator
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-500 font-mono text-xs">Click outside to close</span>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors font-mono text-sm"
            >
              [ESC]
            </button>
          </div>
        </div>
        <div 
          ref={terminalRef}
          className="bg-black text-green-400 font-mono text-sm p-4 h-96 overflow-y-auto custom-scrollbar cli-output"
          style={{ fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace' }}
        >
          {lines.map((line, index) => (
            <div 
              key={line.id}
                             className={`${
                 line.type === 'command' ? 'text-cyan-400 cli-prompt' :
                 line.type === 'success' ? 'text-green-400 crypto-glow' :
                 line.type === 'error' ? 'text-red-400' :
                 line.type === 'warning' ? 'text-yellow-400' :
                 line.type === 'info' ? 'text-blue-400' :
                 'text-green-300'
               } ${line.isTyping ? 'typing data-stream' : ''}`}
            >
              {line.text}
              {line.isTyping && showCursor && (
                <span className="bg-green-400 text-black ml-1 animate-pulse">▊</span>
              )}
            </div>
          ))}
          {isGenerating && !isComplete && (
            <div className="text-green-400">
              {showCursor && <span className="bg-green-400 text-black animate-pulse">▊</span>}
            </div>
          )}
        </div>
        <div className="bg-gray-900 border-t border-green-500/30 px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-4 text-xs text-gray-400 font-mono">
            <span>⚡ {isGenerating ? 'COMPUTING...' : isComplete ? 'READY' : 'IDLE'}</span>
            <span>🔐 ENCRYPTED</span>
            <span>🕵️  ANONYMOUS</span>
          </div>
          <div className="flex space-x-3">
            {!isGenerating && !waitingForTransaction && (
              <button
                onClick={onClose}
                className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-4 py-2 rounded font-mono text-sm transition-colors"
              >
                [ESC] Close
              </button>
            )}
            {waitingForTransaction && generatedProof && (
              <button
                onClick={executeWithdrawal}
                className="bg-green-600 hover:bg-green-700 text-black px-6 py-2 rounded font-mono text-sm font-bold transition-all transform hover:scale-105 animate-pulse"
              >
                🚀 EXECUTE WITHDRAWAL
              </button>
            )}
          </div>
        </div>
      </div>
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1a1a1a;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #10b981;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #059669;
        }
        .typing {
          overflow: hidden;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}