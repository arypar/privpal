"use client"
import React, { useEffect, useState, useCallback } from 'react';
interface TransactionData {
  id: string;
  fromAddress: string;
  toAddress: string;
  amount: string;
  timestamp: Date;
  status: 'success' | 'pending';
}
interface FloatingTransactionProps {
  transaction: TransactionData;
  onComplete: () => void;
}
class GarbledText {
  private chars = '0123456789ABCDEFabcdef';
  private flickerChars = '▓░▒▓░▒▓'; 
  generateGarbledAddress(): string {
    let address = '0x';
    for (let i = 0; i < 2; i++) {
      if (Math.random() < 0.1) {
        address += this.flickerChars[Math.floor(Math.random() * this.flickerChars.length)];
      } else {
        address += this.chars[Math.floor(Math.random() * this.chars.length)];
      }
    }
    address += '...';
    for (let i = 0; i < 4; i++) {
      if (Math.random() < 0.1) {
        address += this.flickerChars[Math.floor(Math.random() * this.flickerChars.length)];
      } else {
        address += this.chars[Math.floor(Math.random() * this.chars.length)];
      }
    }
    return address;
  }
  generateGarbledAmount(): string {
    let baseAmount = Math.floor(Math.random() * 9999) + 1; 
    let amountStr = baseAmount.toString();
    if (Math.random() < 0.15) {
      const pos = Math.floor(Math.random() * amountStr.length);
      amountStr = amountStr.substring(0, pos) + 
                  this.flickerChars[Math.floor(Math.random() * this.flickerChars.length)] + 
                  amountStr.substring(pos + 1);
    }
    if (Math.random() < 0.3) {
      const decimals = (Math.random() * 0.99).toFixed(2).substring(1); 
      return amountStr + decimals;
    }
    return amountStr;
  }
}
const garbler = new GarbledText();
function FloatingTransaction({ transaction, onComplete }: FloatingTransactionProps) {
  const [fromAddress, setFromAddress] = useState(transaction.fromAddress);
  const [toAddress, setToAddress] = useState(transaction.toAddress);
  const [amount, setAmount] = useState(transaction.amount);
  const [position, setPosition] = useState(() => {
    if (typeof window !== 'undefined') {
      const maxWidth = window.innerWidth - 280; 
      return {
        x: Math.max(20, Math.random() * Math.max(maxWidth, 100)), 
        y: window.innerHeight + 50 
      };
    }
    return { x: 50, y: 800 };
  });
  useEffect(() => {
    const garbleInterval = setInterval(() => {
      setFromAddress(garbler.generateGarbledAddress());
      setToAddress(garbler.generateGarbledAddress());
      setAmount(garbler.generateGarbledAmount());
    }, 150); 
    return () => clearInterval(garbleInterval);
  }, []);
  useEffect(() => {
    const startX = position.x;
    const startY = position.y;
    const horizontalDrift = (Math.random() - 0.5) * 200; 
    const endX = Math.max(20, Math.min(startX + horizontalDrift, (typeof window !== 'undefined' ? window.innerWidth : 800) - 300));
    const endY = -200; 
    let currentY = startY;
    let currentX = startX;
    const animationDuration = 8000; 
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / animationDuration;
      if (progress >= 1) {
        onComplete();
        return;
      }
      const easeOut = (t: number) => 1 - Math.pow(1 - t, 3); 
      const easedProgress = easeOut(progress);
      currentY = startY + (endY - startY) * easedProgress;
      currentX = startX + (endX - startX) * easedProgress;
      setPosition({ x: currentX, y: currentY });
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [onComplete]);
  const statusColors = {
    success: 'border-green-500/50 bg-green-500/10 shadow-green-500/20',
    pending: 'border-yellow-500/50 bg-yellow-500/10 shadow-yellow-500/20'
  };
  const statusLabels = {
    success: 'Confirmed',
    pending: 'Processing'
  };
  return (
    <div
      className={`fixed pointer-events-none z-[60] min-w-[240px] max-w-[280px] p-3 
                  rounded-lg border backdrop-blur-md transition-all duration-300
                  bg-black/80 border-cyan-500/50 shadow-2xl shadow-cyan-500/30
                  animate-pulse`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translateZ(0)', 
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
        <span className="text-cyan-400 font-semibold text-sm">Anonymous Transfer</span>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
          transaction.status === 'success' 
            ? 'bg-green-500/20 text-green-400' 
            : 'bg-yellow-500/20 text-yellow-400'
        }`}>
          {statusLabels[transaction.status]}
        </span>
      </div>
      <div className="text-white/90 text-xs leading-relaxed">
        <span className="font-mono text-pink-400 font-semibold blur-[0.8px] animate-pulse transition-all duration-150">
          {fromAddress}
        </span>
        {' sent '}
        <span className="font-bold text-cyan-400 blur-[1px] animate-pulse transition-all duration-150 tracking-wider">
          {amount}
        </span>
        {' PYUSD to '}
        <span className="font-mono text-pink-400 font-semibold blur-[0.8px] animate-pulse transition-all duration-150">
          {toAddress}
        </span>
      </div>
      <div className="text-xs text-white/40 text-right mt-2">
        {transaction.timestamp.toLocaleTimeString()}
      </div>
    </div>
  );
}
export function FloatingTransactions() {
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const createTransaction = useCallback(() => {
    setTransactions(prev => {
      if (prev.length >= 4) {
        return prev;
      }
      const newTransaction: TransactionData = {
        id: Math.random().toString(36).substr(2, 9),
        fromAddress: garbler.generateGarbledAddress(),
        toAddress: garbler.generateGarbledAddress(),
        amount: garbler.generateGarbledAmount(),
        timestamp: new Date(),
        status: Math.random() > 0.3 ? 'success' : 'pending'
      };
      return [...prev, newTransaction];
    });
  }, []);
  const removeTransaction = useCallback((id: string) => {
    setTransactions(prev => prev.filter(tx => tx.id !== id));
  }, []);
  useEffect(() => {
    createTransaction();
    const createNext = () => {
      createTransaction();
      const nextInterval = Math.random() * 4000 + 3000; 
      setTimeout(createNext, nextInterval);
    };
    const timeout = setTimeout(createNext, Math.random() * 2000 + 2000);
    return () => clearTimeout(timeout);
  }, [createTransaction]);
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {transactions.length > 0 && (
        <div className="absolute top-4 left-4 bg-black/50 text-white p-2 rounded text-xs z-[100]">
          Active transactions: {transactions.length}
        </div>
      )}
      {transactions.map(transaction => (
        <FloatingTransaction
          key={transaction.id}
          transaction={transaction}
          onComplete={() => removeTransaction(transaction.id)}
        />
      ))}
    </div>
  );
}