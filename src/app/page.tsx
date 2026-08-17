"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  ShieldCheck,
  TrendingUp,
  Coins,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Sparkles,
  Network,
  Wallet,
  Clock,
  Percent,
  Lock,
  AlertCircle,
  ArrowDown,
  Code2,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ethers } from "ethers";
import { CREDIT_LENDER_ABI } from "@/lib/abis";
import { friendlyError } from "@/lib/errors";

type VerificationStep = {
  label: string;
  status: "pending" | "active" | "done";
};

type RepaymentRecord = {
  loanId: number;
  amount: string;
  txHash: string;
  timestamp: string;
  chain: string;
};

type LoanRecord = {
  loanId: number;
  principal: string;
  interestRate: string;
  collateral: string;
  status: "active" | "repaid";
};

export default function Home() {
  const [creditScore, setCreditScore] = useState(0);
  const [verifiedRepayments, setVerifiedRepayments] = useState(0);
  const [totalVerifiedAmount, setTotalVerifiedAmount] = useState("0");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationSteps, setVerificationSteps] = useState<VerificationStep[]>([]);
  const [repaymentHistory, setRepaymentHistory] = useState<RepaymentRecord[]>([]);
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [hasImported, setHasImported] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [scoreAnimating, setScoreAnimating] = useState(false);
  const [showHero, setShowHero] = useState(true);
  const [txHashInput, setTxHashInput] = useState("");
  const [isTakingLoan, setIsTakingLoan] = useState(false);
  const [loanError, setLoanError] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [wrongChain, setWrongChain] = useState(false);
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);

  // Load existing credit score on mount or when wallet changes
  const loadScore = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const params = walletAddress ? `?address=${walletAddress}` : "";
      const res = await fetch(`/api/credit-score${params}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Failed to load (${res.status})`);
      }
      const data = await res.json();
      if (data.score > 0) {
        setCreditScore(data.score);
        setVerifiedRepayments(data.verifiedRepayments);
        setTotalVerifiedAmount(data.totalVerifiedAmount);
        setHasImported(true);
        setRepaymentHistory(
          data.repayments.map((r: { loanId: number; amount: string; txHash: string; timestamp: string; sourceChainKey: number }) => ({
            loanId: r.loanId,
            amount: `${r.amount} ETH`,
            txHash: `${r.txHash.slice(0, 8)}...${r.txHash.slice(-6)}`,
            timestamp: new Date(r.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            chain: r.sourceChainKey === 1 ? "Sepolia" : "Unknown",
          }))
        );
        announce(`Credit score loaded: ${data.score}, ${data.verifiedRepayments} verified repayments.`);
      }
    } catch (err) {
      console.error("Failed to load credit score:", err);
      setLoadError(friendlyError(err, "Loading credit score"));
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    loadScore();
  }, [loadScore]);

  const scoreTier = getScoreTier(creditScore);
  const loanTerms = getLoanTerms(creditScore);

  function announce(message: string) {
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = message;
    }
  }

  function scrollToDashboard() {
    setShowHero(false);
    setTimeout(() => {
      dashboardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  const connectWallet = useCallback(async () => {
    setIsConnectingWallet(true);
    setWalletError(null);
    try {
      const eth = (window as unknown as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<string[]> } }).ethereum;
      if (!eth) {
        setWalletError("No wallet found. Install MetaMask or another web3 wallet.");
        return;
      }
      const accounts = await eth.request({ method: "eth_requestAccounts" });
      if (accounts && accounts.length > 0) {
        setWalletAddress(accounts[0]);
        announce(`Wallet connected: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`);
        // Check chain
        const chainIdHex = await eth.request({ method: "eth_chainId" });
        setWrongChain(Number(chainIdHex) !== 10203);
      }
    } catch (err) {
      const msg = friendlyError(err, "Connecting wallet");
      setWalletError(msg);
    } finally {
      setIsConnectingWallet(false);
    }
  }, []);

  const switchToCreditcoin = useCallback(async () => {
    try {
      const eth = (window as unknown as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
      if (!eth) return;
      try {
        await eth.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x27db" }],
        });
      } catch (switchErr) {
        // 4902 = chain not added to wallet yet
        if (switchErr && typeof switchErr === "object" && "code" in switchErr && switchErr.code === 4902) {
          await eth.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: "0x27db",
              chainName: "Creditcoin Testnet",
              nativeCurrency: { name: "Creditcoin", symbol: "tCTC", decimals: 18 },
              rpcUrls: ["https://rpc.cc3-testnet.creditcoin.network"],
              blockExplorerUrls: ["https://creditcoin-testnet.blockscout.com"],
            }],
          });
        } else {
          throw switchErr;
        }
      }
      setWrongChain(false);
      announce("Switched to Creditcoin testnet.");
    } catch (err) {
      const msg = friendlyError(err, "Switching network");
      setWalletError(msg);
    }
  }, []);

  // Detect chain changes — event listener + polling fallback
  useEffect(() => {
    if (!walletAddress) return;

    const checkChain = async () => {
      try {
        const eth = (window as unknown as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
        if (!eth) return;
        const chainIdHex = await eth.request({ method: "eth_chainId" });
        setWrongChain(Number(chainIdHex) !== 10203);
      } catch {
        // ignore — will retry on next poll
      }
    };

    // Check immediately
    checkChain();

    // Poll every 3s as fallback (Rainbow doesn't always fire chainChanged events)
    const interval = setInterval(checkChain, 3000);

    // Also try event listener
    const eth = (window as unknown as { ethereum?: { on?: (event: string, handler: (...args: unknown[]) => void) => void; removeListener?: (event: string, handler: (...args: unknown[]) => void) => void } }).ethereum;
    if (eth?.on) {
      const handler = (...args: unknown[]) => {
        const chainId = args[0] as string;
        setWrongChain(Number(chainId) !== 10203);
      };
      eth.on("chainChanged", handler);
      return () => {
        clearInterval(interval);
        eth.removeListener?.("chainChanged", handler);
      };
    }

    return () => clearInterval(interval);
  }, [walletAddress]);

  const disconnectWallet = useCallback(() => {
    setWalletAddress(null);
    setWrongChain(false);
    setCreditScore(0);
    setVerifiedRepayments(0);
    setTotalVerifiedAmount("0");
    setRepaymentHistory([]);
    setHasImported(false);
    setLoans([]);
    announce("Wallet disconnected.");
  }, []);

  const handleImportRepayment = useCallback(async (customTxHash?: string) => {
    const txHash = customTxHash || txHashInput.trim() || "0xc209d676ae17e2f2d938535561aab96bab772b69fdadcc11918d9d2b945bf79e";

    if (txHashInput.trim() && !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      setVerifyError("Invalid transaction hash. Must be 0x followed by 64 hex characters.");
      return;
    }

    setIsVerifying(true);
    setVerifyError(null);
    setVerificationSteps([
      { label: "Fetching Sepolia transaction data", status: "active" },
      { label: "Generating cross-chain proof via Attestcoin Protocol", status: "pending" },
      { label: "Submitting proof to BlockProver precompile", status: "pending" },
      { label: "Verifying block header on Creditcoin", status: "pending" },
      { label: "Decoding verified transaction data", status: "pending" },
      { label: "Updating credit score on-chain", status: "pending" },
    ]);
    announce("Starting cross-chain verification via Attestcoin Protocol.");

    await sleep(800);
    setVerificationSteps((prev) => [
      { label: "Fetching Sepolia transaction data", status: "done" },
      { label: "Generating cross-chain proof via Attestcoin Protocol", status: "active" },
      { label: "Submitting proof to BlockProver precompile", status: "pending" },
      { label: "Verifying block header on Creditcoin", status: "pending" },
      { label: "Decoding verified transaction data", status: "pending" },
      { label: "Updating credit score on-chain", status: "pending" },
    ]);
    announce("Sepolia transaction fetched. Generating cryptographic proof...");

    try {
      const response = await fetch("/api/verify-repayment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash, borrowerAddress: walletAddress }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Verification failed");
      }

      setVerificationSteps([
        { label: "Fetching Sepolia transaction data", status: "done" },
        { label: "Generating cross-chain proof via Attestcoin Protocol", status: "done" },
        { label: "Submitting proof to BlockProver precompile", status: "done" },
        { label: "Verifying block header on Creditcoin", status: "done" },
        { label: "Decoding verified transaction data", status: "done" },
        { label: "Updating credit score on-chain", status: "done" },
      ]);

      setCreditScore(data.score);
      setVerifiedRepayments(data.verifiedRepayments);
      setTotalVerifiedAmount(data.totalVerifiedAmount);
      setHasImported(true);
      setScoreAnimating(true);
      setTimeout(() => setScoreAnimating(false), 600);
      setRepaymentHistory((prev) => [
        ...prev,
        {
          loanId: data.verifiedRepayments - 1,
          amount: `${data.totalVerifiedAmount} ETH`,
          txHash: `${txHash.slice(0, 8)}...${txHash.slice(-6)}`,
          timestamp: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          chain: "Sepolia",
        },
      ]);
      announce(`Verification complete. Credit score updated to ${data.score}. ${data.verifiedRepayments} repayments verified.`);
    } catch (err) {
      console.error("Verification failed:", err);
      const msg = friendlyError(err, "Verification");
      setVerifyError(msg);
      setVerificationSteps([]);
      announce(`Verification failed: ${msg}`);
    }

    await sleep(500);
    setIsVerifying(false);
  }, [txHashInput, walletAddress]);

  const handleTakeLoan = useCallback(async () => {
    setIsTakingLoan(true);
    setLoanError(null);

    if (walletAddress) {
      // Client-side: user signs the tx with their own wallet
      announce("Please confirm the loan transaction in your wallet...");
      try {
        const eth = (window as unknown as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
        if (!eth) {
          throw new Error("No wallet found. Connect your wallet first.");
        }
        const provider = new ethers.BrowserProvider(eth as unknown as ethers.Eip1193Provider);
        const network = await provider.getNetwork();
        const creditcoinChainId = 10203;
        if (Number(network.chainId) !== creditcoinChainId) {
          // Try to switch — switchToCreditcoin handles add+switch
          await switchToCreditcoin();
        }
        const signer = await provider.getSigner();
        const lender = new ethers.Contract(
          "0x1A69795A4C0d957e47c240BAa8DbC1f5d91290F2",
          CREDIT_LENDER_ABI,
          signer
        );
        const borrowAmountWei = ethers.parseEther(loanTerms.maxBorrow.replace(/[^0-9.]/g, ""));
        const collateralWei = ethers.parseEther((parseFloat(loanTerms.maxBorrow.replace(/[^0-9.]/g, "")) / 2).toString());
        const tx = await lender.borrow(borrowAmountWei, 30, { value: collateralWei });
        const receipt = await tx.wait();
        const loanCount = await lender.getLoanCount();
        const loanId = Number(loanCount) - 1;
        const loanData = await lender.getLoan(loanId);
        const newLoan: LoanRecord = {
          loanId,
          principal: `${ethers.formatEther(loanData[1])} tCTC`,
          interestRate: `${Number(loanData[2]) / 100}%`,
          collateral: `${ethers.formatEther(loanData[3])} tCTC`,
          status: "active",
        };
        setLoans((prev) => [...prev, newLoan]);
        announce(`Loan #${loanId} issued on Creditcoin at ${Number(loanData[2]) / 100}% APR.`);
      } catch (err) {
        const msg = friendlyError(err, "Taking loan");
        setLoanError(msg);
        announce(`Loan failed: ${msg}`);
      } finally {
        setIsTakingLoan(false);
      }
      return;
    }

    // Server-side fallback (demo relayer — loan issued to deployer address)
    announce("Submitting loan request via relayer on Creditcoin...");
    try {
      const response = await fetch("/api/take-loan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          borrowAmount: loanTerms.maxBorrow.replace(/[^0-9.]/g, ""),
          durationDays: 30,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to take loan");
      }

      const newLoan: LoanRecord = {
        loanId: data.loanId,
        principal: `${data.principal} tCTC`,
        interestRate: data.interestRate,
        collateral: `${data.collateral} tCTC`,
        status: "active",
      };
      setLoans((prev) => [...prev, newLoan]);
      announce(`Loan #${data.loanId} issued on Creditcoin at ${data.interestRate} APR.`);
    } catch (err) {
      console.error("Take loan failed:", err);
      const msg = friendlyError(err, "Taking loan");
      setLoanError(msg);
      announce(`Loan failed: ${msg}`);
    } finally {
      setIsTakingLoan(false);
    }
  }, [loanTerms.maxBorrow, walletAddress, switchToCreditcoin]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Live region for screen readers */}
      <div ref={liveRegionRef} aria-live="polite" aria-atomic="true" className="sr-only" />

      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-[1120px] items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
            <span className="text-base font-semibold tracking-tight">CreditPass</span>
            <Badge variant="secondary" className="ml-2 text-xs">
              Powered by Attestcoin Protocol
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {walletAddress ? (
              <>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Wallet className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span className="font-mono">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
                </div>
                {wrongChain && (
                  <Button onClick={switchToCreditcoin} variant="outline" size="sm" className="h-8 border-destructive/40 text-destructive">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Wrong Network
                  </Button>
                )}
                <Button onClick={disconnectWallet} variant="ghost" size="sm" className="h-8 px-2">
                  <LogOut className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <Button
                onClick={connectWallet}
                disabled={isConnectingWallet}
                variant="outline"
                size="sm"
                className="min-h-[36px]"
              >
                {isConnectingWallet ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Wallet className="h-4 w-4" />
                )}
                Connect Wallet
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero section */}
      {showHero && (
        <section className="border-b border-border animate-in">
          <div className="mx-auto max-w-[1120px] px-5 py-16 md:py-24">
            <div className="max-w-2xl">
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl md:leading-[2.75rem]">
                Your repayment history on Ethereum is your credit score on Creditcoin.
              </h1>
              <p className="mt-4 text-base text-muted-foreground md:text-lg">
                CreditPass verifies Sepolia loan repayments on Creditcoin using the Attestcoin Protocol —
                no oracle, no intermediary. Just cryptographic proof.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button onClick={scrollToDashboard} size="lg" className="min-h-[44px]">
                  Try the demo
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => window.open("https://github.com/DruxAMB/creditpass", "_blank")}
                  variant="outline"
                  size="lg"
                  className="min-h-[44px]"
                >
                  <Code2 className="h-4 w-4" />
                  View source
                </Button>
              </div>
            </div>

            {/* Architecture diagram */}
            <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card className="animate-slide-up" style={{ animationDelay: "0ms" }}>
                <CardContent className="pt-6">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                    <span className="text-base font-bold text-primary">1</span>
                  </div>
                  <h3 className="mb-1 font-semibold">Repay on Ethereum</h3>
                  <p className="text-sm text-muted-foreground">
                    Borrowers repay loans on Sepolia. The transaction is recorded on-chain — nothing special, just a normal tx.
                  </p>
                </CardContent>
              </Card>
              <Card className="animate-slide-up" style={{ animationDelay: "100ms" }}>
                <CardContent className="pt-6">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                    <span className="text-base font-bold text-primary">2</span>
                  </div>
                  <h3 className="mb-1 font-semibold">Verify via Attestcoin Protocol</h3>
                  <p className="text-sm text-muted-foreground">
                    A cryptographic proof of the Sepolia tx is generated and verified on Creditcoin through the BlockProver precompile at <code className="font-mono text-xs">0x...0FD2</code>.
                  </p>
                </CardContent>
              </Card>
              <Card className="animate-slide-up" style={{ animationDelay: "200ms" }}>
                <CardContent className="pt-6">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                    <span className="text-base font-bold text-primary">3</span>
                  </div>
                  <h3 className="mb-1 font-semibold">Borrow with better terms</h3>
                  <p className="text-sm text-muted-foreground">
                    Verified repayments become a credit score on Creditcoin, unlocking lower interest rates and higher borrowing limits.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      )}

      {/* Dashboard */}
      <main ref={dashboardRef} className="mx-auto max-w-[1120px] px-5 py-8 md:py-12">
        {/* Wallet error state */}
        {walletError && (
          <Card className="mb-6 border-destructive/30 bg-destructive/5 animate-in">
            <CardContent className="flex items-center gap-3 pt-6">
              <AlertCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
              <div className="flex-1">
                <p className="text-sm font-medium">Wallet error</p>
                <p className="text-xs text-muted-foreground">{walletError}</p>
              </div>
              <Button onClick={() => setWalletError(null)} variant="ghost" size="sm">
                Dismiss
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Load error state */}
        {loadError && (
          <Card className="mb-6 border-destructive/30 bg-destructive/5">
            <CardContent className="flex items-center gap-3 pt-6">
              <AlertCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
              <div className="flex-1">
                <p className="text-sm font-medium">Failed to load credit score</p>
                <p className="text-xs text-muted-foreground">{loadError}</p>
              </div>
              <Button
                onClick={() => {
                  setLoadError(null);
                  setIsLoading(true);
                  loadScore();
                }}
                variant="outline"
                size="sm"
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Verify error state */}
        {verifyError && !isVerifying && (
          <Card className="mb-6 border-destructive/30 bg-destructive/5 animate-in">
            <CardContent className="flex items-center gap-3 pt-6">
              <AlertCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
              <div className="flex-1">
                <p className="text-sm font-medium">Verification failed</p>
                <p className="text-xs text-muted-foreground">{verifyError}</p>
              </div>
              <Button onClick={() => setVerifyError(null)} variant="ghost" size="sm">
                Dismiss
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Loan error state */}
        {loanError && !isTakingLoan && (
          <Card className="mb-6 border-destructive/30 bg-destructive/5 animate-in">
            <CardContent className="flex items-center gap-3 pt-6">
              <AlertCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
              <div className="flex-1">
                <p className="text-sm font-medium">Loan failed</p>
                <p className="text-xs text-muted-foreground">{loanError}</p>
              </div>
              <Button onClick={() => setLoanError(null)} variant="ghost" size="sm">
                Dismiss
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="mb-8 grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-3">
          {/* Credit score card */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <TrendingUp className="h-4 w-4" aria-hidden="true" />
                Credit Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="skeleton h-32 w-32 rounded-full" />
                  <div className="skeleton h-6 w-20 rounded-full" />
                  <div className="flex gap-4">
                    <div className="skeleton h-8 w-16" />
                    <div className="skeleton h-8 w-16" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className={`relative flex h-32 w-32 items-center justify-center rounded-full border-4 border-border ${scoreAnimating ? "animate-score" : ""}`}>
                    <div className="text-center">
                      <div className="text-3xl font-bold tabular">{creditScore}</div>
                      <div className="text-xs text-muted-foreground">/ 950</div>
                    </div>
                  </div>
                  <Badge className={`${scoreTier.badgeClass} border-0`}>
                    {scoreTier.label}
                  </Badge>
                  <div className="flex gap-4 text-center">
                    <div>
                      <div className="text-lg font-semibold tabular">{verifiedRepayments}</div>
                      <div className="text-xs text-muted-foreground">Verified Repayments</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold tabular">{totalVerifiedAmount} ETH</div>
                      <div className="text-xs text-muted-foreground">Total Verified</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Loan terms card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Coins className="h-4 w-4" aria-hidden="true" />
                Available Loan Terms
              </CardTitle>
              <CardDescription>
                {creditScore === 0
                  ? "No credit history verified. Import your repayment history to unlock better terms."
                  : "Terms based on your verified cross-chain credit score."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="skeleton h-20 rounded-lg" />
                  <div className="skeleton h-20 rounded-lg" />
                  <div className="skeleton h-11 col-span-2 rounded-lg" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border border-border bg-muted/50 p-4">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Percent className="h-3 w-3" aria-hidden="true" />
                        Interest Rate
                      </div>
                      <div className={`mt-1 text-2xl font-bold tabular ${creditScore === 0 ? "text-destructive" : "text-primary"}`}>
                        {loanTerms.interestRate}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/50 p-4">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Coins className="h-3 w-3" aria-hidden="true" />
                        Max Borrow
                      </div>
                      <div className={`mt-1 text-2xl font-bold tabular ${creditScore === 0 ? "text-destructive" : "text-primary"}`}>
                        {loanTerms.maxBorrow}
                      </div>
                    </div>
                  </div>

                  {/* Tx hash input */}
                  <div className="mt-4">
                    <label htmlFor="txhash" className="mb-1.5 block text-xs text-muted-foreground">
                      Sepolia tx hash (optional — defaults to demo tx)
                    </label>
                    <Input
                      id="txhash"
                      type="text"
                      placeholder="0x..."
                      value={txHashInput}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTxHashInput(e.target.value)}
                      disabled={isVerifying}
                      className="font-mono text-sm"
                    />
                  </div>

                  {creditScore === 0 ? (
                    <Button
                      onClick={() => handleImportRepayment()}
                      disabled={isVerifying}
                      className="mt-3 w-full min-h-[44px]"
                      size="lg"
                    >
                      {isVerifying ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <Network className="h-4 w-4" />
                          Import Repayment History
                        </>
                      )}
                    </Button>
                  ) : (
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <Button
                        onClick={handleTakeLoan}
                        disabled={isTakingLoan || (walletAddress ? wrongChain : false)}
                        className="flex-1 min-h-[44px]"
                        size="lg"
                      >
                        {isTakingLoan ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Issuing on Creditcoin...
                          </>
                        ) : (
                          <>
                            Take Loan at {loanTerms.interestRate}
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => handleImportRepayment()}
                        disabled={isVerifying}
                        variant="outline"
                        className="min-h-[44px]"
                      >
                        {isVerifying ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            Import More
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                  {creditScore > 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {walletAddress && wrongChain
                        ? "Wrong network. Click \"Wrong Network\" in the header to switch to Creditcoin testnet."
                        : walletAddress
                          ? "You will sign the loan transaction with your connected wallet on Creditcoin testnet."
                          : "Without a connected wallet, the loan is issued via a demo relayer. Connect your wallet to borrow with your own address."}
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Verification progress */}
        {isVerifying && (
          <Card className="mb-8 border-primary/30 bg-primary/5 animate-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-primary">
                <Network className="h-4 w-4" aria-hidden="true" />
                Attestcoin Protocol Verification
              </CardTitle>
              <CardDescription>
                Cryptographically verifying your Sepolia repayment on Creditcoin — no oracle required.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {verificationSteps.map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {step.status === "done" ? (
                      <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
                    ) : step.status === "active" ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-border" aria-hidden="true" />
                    )}
                    <span
                      className={`text-sm ${
                        step.status === "done"
                          ? "text-muted-foreground line-through"
                          : step.status === "active"
                            ? "text-foreground font-medium"
                            : "text-muted-foreground/50"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="history" className="w-full">
          <TabsList>
            <TabsTrigger value="history">
              Repayment History
            </TabsTrigger>
            <TabsTrigger value="loans">
              Active Loans
            </TabsTrigger>
            <TabsTrigger value="how">
              How It Works
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Verified Cross-Chain Repayments
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    <div className="skeleton h-16 rounded-lg" />
                    <div className="skeleton h-16 rounded-lg" />
                  </div>
                ) : repaymentHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Clock className="mb-2 h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
                    <p className="text-sm text-muted-foreground">
                      No repayments verified yet. Import your repayment history to build your credit score.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {repaymentHistory.map((record, i) => (
                      <div
                        key={i}
                        className="flex flex-col gap-3 rounded-lg border border-border bg-muted/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
                            <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
                          </div>
                          <div>
                            <div className="text-sm font-medium">
                              Repaid {record.amount}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Loan #{record.loanId} · {record.chain} · {record.timestamp}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-primary/30 text-primary">
                            Verified On-Chain
                          </Badge>
                          <span className="font-mono text-xs text-muted-foreground">
                            {record.txHash}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="loans" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Your Loans on Creditcoin
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loans.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Lock className="mb-2 h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
                    <p className="text-sm text-muted-foreground">
                      No active loans. Build your credit score first to unlock borrowing.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {loans.map((loan, i) => (
                      <div
                        key={i}
                        className="flex flex-col gap-3 rounded-lg border border-border bg-muted/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary">
                            <Coins className="h-5 w-5 text-secondary-foreground" aria-hidden="true" />
                          </div>
                          <div>
                            <div className="text-sm font-medium">
                              Borrowed {loan.principal}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Loan #{loan.loanId} · {loan.interestRate} APR · Collateral: {loan.collateral}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline">
                          {loan.status === "active" ? "Active" : "Repaid"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="how" className="mt-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                    <span className="text-lg font-bold text-primary">1</span>
                  </div>
                  <h3 className="mb-1 font-semibold">Repay on Ethereum</h3>
                  <p className="text-sm text-muted-foreground">
                    Borrowers repay loans on Ethereum Sepolia. The repayment transaction is recorded on-chain.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                    <span className="text-lg font-bold text-primary">2</span>
                  </div>
                  <h3 className="mb-1 font-semibold">Verify via Attestcoin Protocol</h3>
                  <p className="text-sm text-muted-foreground">
                    The Attestcoin Protocol generates a cryptographic proof of the Sepolia transaction and verifies it
                    on Creditcoin via the BlockProver precompile — no oracle, no intermediary.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                    <span className="text-lg font-bold text-primary">3</span>
                  </div>
                  <h3 className="mb-1 font-semibold">Borrow with better terms</h3>
                  <p className="text-sm text-muted-foreground">
                    Your verified repayment history becomes a credit score on Creditcoin, unlocking lower interest rates
                    and higher borrowing limits.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function getScoreTier(score: number) {
  if (score >= 900) return { label: "Platinum", badgeClass: "bg-cyan-500/20 text-cyan-300" };
  if (score >= 750) return { label: "Gold", badgeClass: "bg-amber-500/20 text-amber-300" };
  if (score >= 600) return { label: "Silver", badgeClass: "bg-slate-400/20 text-slate-200" };
  if (score >= 300) return { label: "Bronze", badgeClass: "bg-orange-600/20 text-orange-300" };
  return { label: "No History", badgeClass: "bg-destructive/20 text-destructive" };
}

function getLoanTerms(score: number) {
  if (score === 0) return { interestRate: "20%", maxBorrow: "10 tCTC" };
  if (score < 600) return { interestRate: "15%", maxBorrow: "50 tCTC" };
  if (score < 750) return { interestRate: "12%", maxBorrow: "100 tCTC" };
  if (score < 900) return { interestRate: "8%", maxBorrow: "500 tCTC" };
  return { interestRate: "5%", maxBorrow: "1000 tCTC" };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
