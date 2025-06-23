"use client"
import React, { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
interface MerkleStatus {
  merkleRoot: string;
  totalUsers: number;
  totalBalance: number;
  timestamp: string;
}
interface UserBalance {
  address: string;
  balance: number;
  timestamp: string;
}
interface MerkleProof {
  leaf: string;
  proof: string[];
  root: string;
  position: number;
}
export function MerkleProofVerifier() {
  const [merkleStatus, setMerkleStatus] = useState<MerkleStatus | null>(null);
  const [userBalance, setUserBalance] = useState<UserBalance | null>(null);
  const [customAddress, setCustomAddress] = useState("");
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);
  const [merkleProof, setMerkleProof] = useState<MerkleProof | null>(null);
  const { address: connectedAddress, isConnected } = useAccount();
  const { toast } = useToast();
  useEffect(() => {
    loadMerkleStatus();
  }, []);
  useEffect(() => {
    if (connectedAddress) {
      loadUserBalance(connectedAddress);
    }
  }, [connectedAddress]);
  const loadMerkleStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const response = await fetch('http://localhost:3001/api/merkle/status');
      const result = await response.json();
      if (result.success) {
        setMerkleStatus(result.data);
      } else {
        toast({
          variant: "error",
          title: "Error",
          description: "Failed to load merkle tree status",
        });
      }
    } catch (err) {
      toast({
        variant: "error",
        title: "Connection Error",
        description: "Failed to connect to server",
      });
    } finally {
      setIsLoadingStatus(false);
    }
  };
  const loadUserBalance = async (address: string) => {
    setIsLoadingBalance(true);
    try {
      const response = await fetch(`http://localhost:3001/api/users/${address}/balance`);
      const result = await response.json();
      if (result.success) {
        setUserBalance(result.data);
      } else {
        toast({
          variant: "error",
          title: "Error",
          description: "Failed to load user balance",
        });
      }
    } catch (err) {
      toast({
        variant: "error",
        title: "Error",
        description: "Failed to load user balance",
      });
    } finally {
      setIsLoadingBalance(false);
    }
  };
  const generateMerkleProof = async (address: string) => {
    setIsGeneratingProof(true);
    setMerkleProof(null);
    try {
      const response = await fetch(`http://localhost:3001/api/merkle/proof/${address}`);
      const result = await response.json();
      if (result.success) {
        setMerkleProof(result.data);
      } else {
        toast({
          variant: "error",
          title: "Error",
          description: result.error || "Failed to generate merkle proof",
        });
      }
    } catch (err) {
      toast({
        variant: "error",
        title: "Error",
        description: "Failed to generate merkle proof",
      });
    } finally {
      setIsGeneratingProof(false);
    }
  };
  const handleGenerateProof = () => {
    const addressToUse = customAddress || connectedAddress;
    if (!addressToUse) {
      toast({
        variant: "error",
        title: "Error",
        description: "Please connect wallet or enter an address",
      });
      return;
    }
    if (!addressToUse.startsWith("0x") || addressToUse.length !== 42) {
      toast({
        variant: "error",
        title: "Invalid Address",
        description: "Please enter a valid Ethereum address",
      });
      return;
    }
    generateMerkleProof(addressToUse);
  };
  const handleCustomAddressLookup = () => {
    if (!customAddress) {
      toast({
        variant: "error",
        title: "Error",
        description: "Please enter an address",
      });
      return;
    }
    if (!customAddress.startsWith("0x") || customAddress.length !== 42) {
      toast({
        variant: "error",
        title: "Invalid Address",
        description: "Please enter a valid Ethereum address",
      });
      return;
    }
    loadUserBalance(customAddress);
  };
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
    });
  };
  return (
    <div className="w-full max-w-4xl space-y-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Merkle Tree Status</h2>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadMerkleStatus}
            disabled={isLoadingStatus}
          >
            {isLoadingStatus ? "Loading..." : "Refresh"}
          </Button>
        </div>
        {merkleStatus ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{merkleStatus.totalUsers}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Users</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{merkleStatus.totalBalance.toFixed(2)}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Balance</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xs font-mono text-gray-800 dark:text-gray-200 break-all">
                {merkleStatus.merkleRoot ? `${merkleStatus.merkleRoot.slice(0, 10)}...` : "No root"}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Merkle Root</div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            {isLoadingStatus ? "Loading merkle tree status..." : "No merkle tree data available"}
          </div>
        )}
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-4">Balance Lookup</h2>
        {isConnected && connectedAddress && (
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="font-medium mb-2">Connected Wallet</h3>
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm">{connectedAddress}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadUserBalance(connectedAddress)}
                disabled={isLoadingBalance}
              >
                {isLoadingBalance ? "Loading..." : "Check Balance"}
              </Button>
            </div>
            {userBalance && userBalance.address.toLowerCase() === connectedAddress.toLowerCase() && (
              <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded border">
                <span className="text-lg font-bold text-green-600">{userBalance.balance} PYUSD</span>
              </div>
            )}
          </div>
        )}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customAddress">Or lookup any address</Label>
            <div className="flex space-x-2">
              <Input
                id="customAddress"
                placeholder="0x..."
                value={customAddress}
                onChange={(e) => setCustomAddress(e.target.value)}
                className="font-mono text-sm"
              />
              <Button 
                onClick={handleCustomAddressLookup}
                disabled={isLoadingBalance || !customAddress}
              >
                Lookup
              </Button>
            </div>
          </div>
          {userBalance && customAddress && userBalance.address.toLowerCase() === customAddress.toLowerCase() && (
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-lg font-bold text-green-600">{userBalance.balance} PYUSD</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Last updated: {new Date(userBalance.timestamp).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-4">Generate Merkle Proof</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Generate a cryptographic proof that your balance is included in the merkle tree. 
          This proof can be used for withdrawals or other verification purposes.
        </p>
        <Button 
          onClick={handleGenerateProof}
          disabled={isGeneratingProof || (!connectedAddress && !customAddress)}
          className="w-full"
        >
          {isGeneratingProof ? "Generating Proof..." : "Generate Merkle Proof"}
        </Button>
        {merkleProof && (
          <div className="mt-6 space-y-4">
            <h3 className="font-semibold text-green-600">✓ Proof Generated Successfully</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label className="text-sm font-medium">Leaf Hash</Label>
                <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded border font-mono text-xs break-all">
                  {merkleProof.leaf}
                  <button 
                    onClick={() => copyToClipboard(merkleProof.leaf)}
                    className="ml-2 text-blue-500 hover:text-blue-700"
                    title="Copy to clipboard"
                  >
                    📋
                  </button>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Merkle Root</Label>
                <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded border font-mono text-xs break-all">
                  {merkleProof.root}
                  <button 
                    onClick={() => copyToClipboard(merkleProof.root)}
                    className="ml-2 text-blue-500 hover:text-blue-700"
                    title="Copy to clipboard"
                  >
                    📋
                  </button>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Position</Label>
                <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded border font-mono text-xs">
                  {merkleProof.position}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Proof Path ({merkleProof.proof.length} hashes)</Label>
                <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded border font-mono text-xs space-y-1">
                  {merkleProof.proof.map((hash, index) => (
                    <div key={index} className="break-all">
                      {index}: {hash}
                      <button 
                        onClick={() => copyToClipboard(hash)}
                        className="ml-2 text-blue-500 hover:text-blue-700"
                        title="Copy to clipboard"
                      >
                        📋
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">How to use this proof:</h4>
              <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                <li>• Save the proof data (leaf, root, position, and proof path)</li>
                <li>• Use it to verify your balance inclusion in the merkle tree</li>
                <li>• Submit it for withdrawal or other verification processes</li>
                <li>• The proof is valid as long as the merkle root hasn't changed</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}