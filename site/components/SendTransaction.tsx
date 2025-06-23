"use client"
import React, { useState } from "react";
import { useSignMessage, useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseUnits, formatUnits } from "viem";
import { CliProofGenerator } from "@/components/CliProofGenerator";
import { ConstantGlitchLogo } from "@/components/GlitchText";
import { useToast } from "@/components/ui/use-toast";
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
const MOCK_ERC20_ABI = [
  {"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"mint","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"}
] as const;
const CONTRACT_ADDRESS = "0x8461Ca63fBc0532beD991279A585a0b8e21D3184" as const;
export function SendTransaction() {
  const [isOpen, setIsOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"form" | "sign" | "deposit">("form");
  const [isLoading, setIsLoading] = useState(false);
  const [signedHash, setSignedHash] = useState<string>("");
  const [transactionHash, setTransactionHash] = useState<string>("");
  const [isApproving, setIsApproving] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [isProofGeneratorOpen, setIsProofGeneratorOpen] = useState(false);
  const [generatedProof, setGeneratedProof] = useState<any>(null);
  const { address: userAddress } = useAccount();
  const { toast } = useToast();
  const { signMessage, data: signedData, error: signError, isPending } = useSignMessage();
  const { writeContract, data: hash, isPending: isContractPending, error: contractError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });
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
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: pyusdTokenAddress,
    abi: MOCK_ERC20_ABI,
    functionName: 'allowance',
    args: userAddress ? [userAddress, CONTRACT_ADDRESS] : undefined,
  });
  React.useEffect(() => {
    if (signedData) {
      setSignedHash(signedData);
      toast({
        variant: "success",
        title: "Message Signed! ✍️",
        description: "Authorization message successfully signed. Submitting to API...",
      });
      submitToAPI(signedData);
    }
  }, [signedData, toast]);
  React.useEffect(() => {
    if (hash) {
      setTransactionHash(hash);
    }
  }, [hash]);
  React.useEffect(() => {
    if (isConfirmed) {
      if (isApproving) {
        setIsApproving(false);
        refetchAllowance();
        toast({
          variant: "success",
          title: "Approval Successful",
          description: "Token approval confirmed. Proceeding with deposit...",
        });
        setTimeout(() => {
          if (pyusdTokenAddress && depositAmount) {
            writeContract({
              address: CONTRACT_ADDRESS,
              abi: CONTRACT_ABI,
              functionName: 'depositPyusd',
              args: [parseUnits(depositAmount, 6)],
            });
          }
        }, 1000); 
      } else {
        // Determine the type of operation that completed
        if (isWithdrawing) {
          toast({
            variant: "success",
            title: "Withdrawal Successful! 🎉",
            description: "Your PYUSD has been successfully withdrawn from the contract.",
          });
        } else if (depositAmount) {
          toast({
            variant: "success",
            title: "Deposit Successful! 💎",
            description: `Successfully deposited ${depositAmount} PYUSD to the contract.`,
          });
          
          // Trigger refresh of API balance after deposit
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('refreshUserBalance'));
          }, 2000); // Give API time to update
        }
        resetForm();
        refetchBalance();
        refetchAllowance();
      }
    }
  }, [isConfirmed, isApproving, refetchBalance, refetchAllowance, isWithdrawing, depositAmount, toast]);
  React.useEffect(() => {
    if (contractError) {
      toast({
        variant: "error",
        title: "Transaction Failed",
        description: contractError.message,
      });
      setIsLoading(false);
    }
  }, [contractError, toast]);
  const submitToAPI = async (signature: string) => {
    try {
      const message = `I am authorizing a send transaction to ${address} for ${amount} PYUSD.`;
      const payload = {
        userAddress: userAddress || '0x0000000000000000000000000000000000000000',
        message: message,
        signedHash: signature,
        recipientAddress: address,
        amount: amount
      };
      const response = await fetch('http://localhost:3001/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (result.success) {
        toast({
          variant: "success",
          title: "Transaction Authorized! ✅",
          description: `Successfully authorized ${amount} PYUSD transfer to ${address.slice(0, 6)}...${address.slice(-4)}`,
        });
        resetForm();
      } else {
        toast({
          variant: "error",
          title: "API Submission Failed",
          description: result.error,
        });
        resetForm(); 
      }
    } catch (error) {
              toast({
          variant: "error",
          title: "Submission Error",
          description: "Failed to submit transaction to API. Signature was still successful.",
        });
        resetForm(); 
    } finally {
      setIsLoading(false);
    }
  };
  React.useEffect(() => {
    if (signError) {
      toast({
        variant: "error",
        title: "Signing Failed",
        description: "Failed to sign message. Please try again.",
      });
      setIsLoading(false);
    }
  }, [signError, toast]);
  const resetForm = () => {
    setAddress("");
    setAmount("");
    setSignedHash("");
    setTransactionHash("");
    setStep("form");
    setIsOpen(false);
    setIsLoading(false);
    setIsApproving(false);
    setIsWithdrawing(false);
    setIsDepositOpen(false);
    setDepositAmount("");
    setIsProofGeneratorOpen(false);
    setGeneratedProof(null);
  };
  const handleSend = () => {
    if (!address || !amount) {
      toast({
        variant: "error",
        title: "Missing Information",
        description: "Please fill in both address and amount fields.",
      });
      return;
    }
    if (!address.startsWith("0x") || address.length !== 42) {
      toast({
        variant: "error",
        title: "Invalid Address",
        description: "Please enter a valid Ethereum address.",
      });
      return;
    }
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({
        variant: "error",
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0.",
      });
      return;
    }
    setStep("sign");
  };
  const handleMintTokens = async () => {
    if (!pyusdTokenAddress || !userAddress) return;
    setIsLoading(true);
    try {
      writeContract({
        address: pyusdTokenAddress,
        abi: MOCK_ERC20_ABI,
        functionName: 'mint',
        args: [userAddress, parseUnits('100', 6)],
      });
    } catch (error) {
      toast({
        variant: "error",
        title: "Minting Failed",
        description: "Failed to mint test tokens.",
      });
      setIsLoading(false);
    }
  };
  const handleApprove = async () => {
    if (!pyusdTokenAddress) return;
    setIsLoading(true);
    try {
      writeContract({
        address: pyusdTokenAddress,
        abi: MOCK_ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACT_ADDRESS, parseUnits('100', 6)],
      });
    } catch (error) {
      toast({
        variant: "error",
        title: "Approval Failed",
        description: "Failed to approve tokens.",
      });
      setIsLoading(false);
    }
  };
  const handleDepositSubmit = async () => {
    if (!depositAmount) {
      toast({
        variant: "error",
        title: "Missing Amount",
        description: "Please specify an amount to deposit.",
      });
      return;
    }
    const depositAmountNum = parseFloat(depositAmount);
    if (isNaN(depositAmountNum) || depositAmountNum <= 0) {
      toast({
        variant: "error",
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0.",
      });
      return;
    }
    setIsDepositOpen(false);
    setIsLoading(true);
    if (!pyusdTokenAddress) {
      toast({
        variant: "error",
        title: "Token Error",
        description: "PYUSD token address not found.",
      });
      setIsLoading(false);
      return;
    }
    try {
      const depositAmountParsed = parseUnits(depositAmount, 6);
      const requiredAllowance = allowance && allowance >= depositAmountParsed;
      if (!requiredAllowance) {
        setIsApproving(true);
        const approvalAmount = parseUnits((depositAmountNum * 10).toString(), 6); 
        writeContract({
          address: pyusdTokenAddress,
          abi: MOCK_ERC20_ABI,
          functionName: 'approve',
          args: [CONTRACT_ADDRESS, approvalAmount],
        });
        return; 
      }
      setIsApproving(false);
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'depositPyusd',
        args: [depositAmountParsed],
      });
    } catch (error) {
      toast({
        variant: "error",
        title: "Transaction Failed",
        description: "Failed to initiate transaction.",
      });
      setIsLoading(false);
      setIsApproving(false);
    }
  };
  const handleSignMessage = async () => {
    setIsLoading(true);
    const message = `I am authorizing a send transaction to ${address} for ${amount} PYUSD.`;
    try {
      await signMessage({ message });
    } catch (err) {
      setIsLoading(false);
    }
  };
  const handleBack = () => {
    setStep("form");
  };
  const handleWithdraw = async () => {
    if (!userAddress) {
      toast({
        variant: "error",
        title: "Wallet Required",
        description: "Please connect your wallet.",
      });
      return;
    }
    setIsProofGeneratorOpen(true);
  };
  const handleProofGenerated = (proof: any) => {
    setGeneratedProof(proof);
    proceedWithWithdraw(proof);
  };
  const proceedWithWithdraw = async (proof: any) => {
    setIsLoading(true);
    setIsWithdrawing(true);
    try {
      const withdrawAmount = parseUnits(proof.balance.toString(), 6);
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'withdraw',
        args: [
          withdrawAmount,
          BigInt(proof.nonce),
          proof.proof,
          proof.leaf
        ],
      });
    } catch (error) {
      toast({
        variant: "error",
        title: "Withdrawal Failed",
        description: "Failed to initiate withdrawal. Make sure you have a balance in the merkle tree.",
      });
      setIsLoading(false);
      setIsWithdrawing(false);
    }
  };
  const userBalanceFormatted = userBalance ? formatUnits(userBalance, 6) : "0";
  const allowanceFormatted = allowance ? formatUnits(allowance, 6) : "0";
  const hasBalance = Boolean(userBalance && userBalance > BigInt(0));
  const hasAllowance = Boolean(allowance && depositAmount && allowance >= parseUnits(depositAmount, 6));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600 transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25 relative overflow-hidden group">
              <span className="relative z-10"><ConstantGlitchLogo>📤 Send PYUSD</ConstantGlitchLogo></span>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"></div>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {step === "form" ? "Send PYUSD" : "Sign Authorization"}
              </DialogTitle>
            </DialogHeader>
            {step === "form" ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Recipient Address</Label>
                  <Input
                    id="address"
                    placeholder="0x..."
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (PYUSD)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    step="0.01"
                    min="0"
                  />
                </div>
                <div className="flex space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSend}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Please sign this message to authorize the transaction:</p>
                  <div className="bg-white p-3 rounded border font-mono text-sm text-gray-900">
                    I am authorizing a send transaction to {address} for {amount} PYUSD.
                  </div>
                </div>
                <div className="flex space-x-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    className="flex-1"
                    disabled={isLoading}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleSignMessage}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    disabled={isLoading || isPending}
                  >
                    {(isLoading || isPending) ? "Signing..." : "Sign Message"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        <Dialog open={isDepositOpen} onOpenChange={setIsDepositOpen}>
          <DialogTrigger asChild>
            <Button 
              disabled={isLoading || isContractPending || (isConfirming && !isWithdrawing) || !hasBalance}
              className="bg-green-600 hover:bg-green-700 text-white transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-green-500/25 relative overflow-hidden group disabled:hover:scale-100 disabled:hover:shadow-none"
            >
              <span className="relative z-10">
                <ConstantGlitchLogo>
                  {`💎 ${isLoading || isContractPending ? 
                    (!hasAllowance ? "Approving..." : "Depositing...") : 
                   isConfirming ? "Confirming..." : "Deposit PYUSD"}`}
                </ConstantGlitchLogo>
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-green-600 via-emerald-500 to-green-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"></div>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Deposit PYUSD</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="depositAmount">Amount (PYUSD)</Label>
                <Input
                  id="depositAmount"
                  type="number"
                  placeholder="0.00"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  step="0.01"
                  min="0"
                />
                <p className="text-sm text-gray-500">
                  Your balance: {userBalanceFormatted} PYUSD
                </p>
              </div>
              <div className="flex space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsDepositOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDepositSubmit}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={isLoading}
                >
                  {isLoading ? "Processing..." : "Deposit"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <Button 
          onClick={handleWithdraw}
          disabled={isLoading || isContractPending || (isConfirming && isWithdrawing)}
          className="mysterious-button bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 hover:from-purple-700 hover:via-pink-700 hover:to-red-700 text-white transition-all duration-300 transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/50 relative overflow-hidden group disabled:hover:scale-100 disabled:hover:shadow-none border border-purple-500/50"
        >
          <span className="relative z-10 font-mono">
            <ConstantGlitchLogo>
              {`🕵️ ${isLoading && isWithdrawing ? "GENERATING PROOF..." :
               isContractPending && isWithdrawing ? "EXECUTING..." :
               isConfirming ? "CONFIRMING..." : "Withdraw PYUSD"}`}
            </ConstantGlitchLogo>
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 opacity-0 group-hover:opacity-30 transition-opacity duration-500 animate-pulse"></div>
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </Button>
      </div>
      <CliProofGenerator
        isVisible={isProofGeneratorOpen}
        onProofGenerated={handleProofGenerated}
        onClose={() => setIsProofGeneratorOpen(false)}
      />
    </div>
  );
}