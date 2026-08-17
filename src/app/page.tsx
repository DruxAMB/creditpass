"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  Coins,
  CheckCircle2,
  Loader2,
  Network,
  Wallet,
  Clock,
  AlertCircle,
  LogOut,
} from "lucide-react";
import { ethers } from "ethers";
import { CREDIT_LENDER_ABI } from "@/lib/abis";
import { friendlyError } from "@/lib/errors";
import { useAccount, useChainId, useSwitchChain, useConnectorClient, useDisconnect } from "wagmi";
import { creditCoin3Testnet } from "wagmi/chains";

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
  const [heroExiting, setHeroExiting] = useState(false);
  const [txHashInput, setTxHashInput] = useState("");
  const [isTakingLoan, setIsTakingLoan] = useState(false);
  const [loanError, setLoanError] = useState<string | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);

  // Wagmi hooks for wallet state
  const { address: walletAddress, isConnecting: isConnectingWallet } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { disconnect } = useDisconnect();
  const { data: connectorClient } = useConnectorClient();
  const wrongChain = !!walletAddress && chainId !== creditCoin3Testnet.id;

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

  function handleDemo() {
    setHeroExiting(true);
    setTimeout(() => {
      setShowHero(false);
      setHeroExiting(false);
      setTimeout(() => {
        dashboardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }, 600);
  }

  async function handleConnectAndBorrow() {
    // If wallet not connected, connect first
    if (!walletAddress) {
      setWalletError(null);
      try {
        const eth = (window as unknown as { ethereum?: { request: (args: { method: string }) => Promise<string[]> } }).ethereum;
        if (!eth) {
          setWalletError("No wallet detected. Please install MetaMask or Rainbow browser extension and refresh the page.");
          return;
        }
        await eth.request({ method: "eth_requestAccounts" });
      } catch (err) {
        const msg = friendlyError(err, "Connecting wallet");
        setWalletError(msg);
        return;
      }
    }
    // Then transition to dashboard
    setHeroExiting(true);
    setTimeout(() => {
      setShowHero(false);
      setHeroExiting(false);
      setTimeout(() => {
        dashboardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }, 600);
  }

  const connectWallet = useCallback(async () => {
    setWalletError(null);
    // wagmi's injected connector handles connect automatically via useAccount
    // We just need to trigger it — but since we're using injected(), the connect happens
    // when the user clicks the button. We'll use window.ethereum as fallback.
    try {
      const eth = (window as unknown as { ethereum?: { request: (args: { method: string }) => Promise<string[]> } }).ethereum;
      if (!eth) {
        setWalletError("No wallet detected. Please install MetaMask or Rainbow browser extension and refresh the page.");
        return;
      }
      await eth.request({ method: "eth_requestAccounts" });
      // wagmi's useAccount will pick up the connection automatically
    } catch (err) {
      const msg = friendlyError(err, "Connecting wallet");
      setWalletError(msg);
    }
  }, []);

  const switchToCreditcoin = useCallback(async () => {
    try {
      await switchChainAsync({ chainId: creditCoin3Testnet.id });
      announce("Switched to Creditcoin testnet.");
    } catch (err) {
      const msg = friendlyError(err, "Switching network");
      setWalletError(msg);
    }
  }, [switchChainAsync]);

  const disconnectWallet = useCallback(() => {
    disconnect();
    setCreditScore(0);
    setVerifiedRepayments(0);
    setTotalVerifiedAmount("0");
    setRepaymentHistory([]);
    setHasImported(false);
    setLoans([]);
    announce("Wallet disconnected.");
  }, [disconnect]);

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

    if (walletAddress && connectorClient) {
      // Client-side: user signs the tx with their own wallet via wagmi
      announce("Please confirm the loan transaction in your wallet...");
      try {
        const provider = new ethers.BrowserProvider(connectorClient as unknown as ethers.Eip1193Provider);
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
        console.error("Take loan (client-side) failed:", err);
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
  }, [loanTerms.maxBorrow, walletAddress, connectorClient]);

  return (
    <div className="min-h-screen bg-paper-white text-ink-black">
      {/* Live region for screen readers */}
      <div ref={liveRegionRef} aria-live="polite" aria-atomic="true" className="sr-only" />

      {/* Header — white top bar, centered wordmark, right-aligned wallet/CTA */}
      <header className="sticky top-0 z-50 bg-paper-white border-b border-ink-black">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="font-ui text-xl font-bold tracking-tight uppercase">CreditPass</span>
            <span className="eyebrow text-muted-foreground hidden sm:inline">Powered by Attestcoin</span>
          </div>
          <div className="flex items-center gap-2">
            {walletAddress ? (
              <>
                <div className="flex items-center gap-1.5 font-label text-sm">
                  <Wallet className="h-4 w-4" aria-hidden="true" />
                  <span>{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
                </div>
                {wrongChain && (
                  <button
                    onClick={switchToCreditcoin}
                    className="font-ui text-xs uppercase tracking-[0.1em] px-3 py-1.5 pill border border-ink-black bg-paper-white hover:bg-eclipse-green transition-colors"
                  >
                    <AlertCircle className="h-3 w-3 inline mr-1" />
                    Wrong Network
                  </button>
                )}
                <button
                  onClick={disconnectWallet}
                  className="font-ui p-1.5 pill border border-ink-black bg-paper-white hover:bg-eclipse-green transition-colors"
                  aria-label="Disconnect wallet"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <button
                onClick={connectWallet}
                disabled={isConnectingWallet}
                className="font-ui text-sm uppercase tracking-[0.1em] px-5 py-2 pill-nav bg-ink-black text-paper-white hover:bg-eclipse-green hover:text-ink-black transition-colors disabled:opacity-50"
              >
                {isConnectingWallet ? (
                  <Loader2 className="h-4 w-4 animate-spin inline" />
                ) : (
                  <Wallet className="h-4 w-4 inline mr-1.5" />
                )}
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero — full-bleed black band with hairline serif headline */}
      {showHero && (
        <section className={`bg-ink-black text-paper-white ${heroExiting ? "hero-exit" : "animate-in"}`}>
          <div className="mx-auto max-w-[1200px] px-5 min-h-[calc(100vh-65px)] flex flex-col items-center justify-center text-center py-20">
            <span className="eyebrow text-paper-white mb-6">CreditPass is</span>
            <h1 className="font-heading font-light leading-[0.85] tracking-[-0.04em] text-5xl md:text-7xl lg:text-8xl">
              Your Ethereum Repayments
            </h1>
            <h1 className="font-heading font-light leading-[0.85] tracking-[-0.04em] text-5xl md:text-7xl lg:text-8xl mt-2">
              Are Your Credit Score
            </h1>
            <p className="mt-8 max-w-xl font-ui text-lg text-paper-white/70 leading-relaxed">
              Verify Sepolia loan repayments on Creditcoin using cryptographic proofs.
              No oracle, no intermediary — just math.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handleDemo}
                className="font-ui text-base uppercase tracking-[0.1em] px-6 py-2.5 pill bg-eclipse-green text-ink-black border border-ink-black hover:scale-105 transition-transform"
              >
                Try the Demo
              </button>
              <button
                onClick={handleConnectAndBorrow}
                className="font-ui text-base uppercase tracking-[0.1em] px-6 py-2.5 pill bg-transparent text-paper-white border border-paper-white hover:bg-paper-white hover:text-ink-black transition-colors"
              >
                <Wallet className="h-4 w-4 inline mr-2" />
                Connect &amp; Borrow
              </button>
            </div>
            <p className="mt-6 font-label text-xs text-paper-white/40 uppercase tracking-[0.2em]">
              Demo uses sample data · Connect &amp; Borrow uses your wallet
            </p>
          </div>
        </section>
      )}

      {/* Marquee strip — only after hero is gone */}
      {!showHero && (
        <div className="border-y border-ink-black overflow-hidden py-4 dashboard-enter">
          <div className="flex gap-8 font-ui text-2xl font-bold uppercase tracking-tight whitespace-nowrap animate-marquee">
            <span>Cross-Chain Credit</span>
            <span>—</span>
            <span>No Oracle Required</span>
            <span>—</span>
            <span>Attestcoin Protocol</span>
            <span>—</span>
            <span>Cryptographic Proof</span>
            <span>—</span>
            <span>Creditcoin Testnet</span>
            <span>—</span>
            <span>Cross-Chain Credit</span>
            <span>—</span>
            <span>No Oracle Required</span>
            <span>—</span>
            <span>Attestcoin Protocol</span>
            <span>—</span>
            <span>Cryptographic Proof</span>
            <span>—</span>
            <span>Creditcoin Testnet</span>
            <span>—</span>
          </div>
        </div>
      )}

      {/* Dashboard */}
      <main ref={dashboardRef} className={`mx-auto max-w-[1200px] px-5 py-20 ${!showHero ? "dashboard-enter" : ""}`}>
        {/* Error states */}
        {walletError && (
          <div className="mb-6 flex items-center gap-3 p-5 pill border border-ink-black bg-paper-white animate-in">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" aria-hidden="true" />
            <div className="flex-1">
              <p className="font-ui text-sm font-bold uppercase tracking-wide">Wallet Error</p>
              <p className="font-ui text-sm text-muted-foreground">{walletError}</p>
            </div>
            <button onClick={() => setWalletError(null)} className="font-ui text-xs uppercase tracking-[0.1em] px-3 py-1 pill border border-ink-black hover:bg-eclipse-green transition-colors">
              Dismiss
            </button>
          </div>
        )}

        {loadError && (
          <div className="mb-6 flex items-center gap-3 p-5 pill border border-ink-black bg-paper-white">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" aria-hidden="true" />
            <div className="flex-1">
              <p className="font-ui text-sm font-bold uppercase tracking-wide">Failed to Load</p>
              <p className="font-ui text-sm text-muted-foreground">{loadError}</p>
            </div>
            <button
              onClick={() => { setLoadError(null); setIsLoading(true); loadScore(); }}
              className="font-ui text-xs uppercase tracking-[0.1em] px-3 py-1 pill border border-ink-black hover:bg-eclipse-green transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {verifyError && !isVerifying && (
          <div className="mb-6 flex items-center gap-3 p-5 pill border border-ink-black bg-paper-white animate-in">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" aria-hidden="true" />
            <div className="flex-1">
              <p className="font-ui text-sm font-bold uppercase tracking-wide">Verification Failed</p>
              <p className="font-ui text-sm text-muted-foreground">{verifyError}</p>
            </div>
            <button onClick={() => setVerifyError(null)} className="font-ui text-xs uppercase tracking-[0.1em] px-3 py-1 pill border border-ink-black hover:bg-eclipse-green transition-colors">
              Dismiss
            </button>
          </div>
        )}

        {loanError && !isTakingLoan && (
          <div className="mb-6 flex items-center gap-3 p-5 pill border border-ink-black bg-paper-white animate-in">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" aria-hidden="true" />
            <div className="flex-1">
              <p className="font-ui text-sm font-bold uppercase tracking-wide">Loan Failed</p>
              <p className="font-ui text-sm text-muted-foreground">{loanError}</p>
            </div>
            <button onClick={() => setLoanError(null)} className="font-ui text-xs uppercase tracking-[0.1em] px-3 py-1 pill border border-ink-black hover:bg-eclipse-green transition-colors">
              Dismiss
            </button>
          </div>
        )}

        {/* Credit Score + Loan Terms */}
        <div className="mb-20 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Credit score card */}
          <div className="lg:col-span-1 p-8 pill border border-ink-black bg-paper-white">
            <div className="eyebrow text-ink-black mb-6">Credit Score</div>
            {isLoading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="skeleton h-32 w-32 rounded-full" />
                <div className="skeleton h-6 w-20" />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className={`relative flex h-32 w-32 items-center justify-center rounded-full border-2 border-ink-black ${scoreAnimating ? "animate-score" : ""}`}>
                  <div className="text-center">
                    <div className="font-heading text-4xl font-light tabular">{creditScore}</div>
                    <div className="font-label text-xs text-muted-foreground">/ 950</div>
                  </div>
                </div>
                <div className={`px-4 py-1.5 pill border border-ink-black font-ui text-sm font-bold uppercase tracking-[0.1em] ${scoreTier.badgeClass}`}>
                  {scoreTier.label}
                </div>
                <div className="flex gap-8 text-center pt-2">
                  <div>
                    <div className="font-ui text-xl font-bold tabular">{verifiedRepayments}</div>
                    <div className="eyebrow text-muted-foreground mt-1">Repayments</div>
                  </div>
                  <div>
                    <div className="font-ui text-xl font-bold tabular">{totalVerifiedAmount}</div>
                    <div className="eyebrow text-muted-foreground mt-1">ETH Verified</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Loan terms card */}
          <div className="lg:col-span-2 p-8 pill border border-ink-black bg-paper-white">
            <div className="eyebrow text-ink-black mb-2">Available Loan Terms</div>
            <p className="font-ui text-sm text-muted-foreground mb-6">
              {creditScore === 0
                ? "No credit history verified. Import your repayment history to unlock better terms."
                : "Terms based on your verified cross-chain credit score."}
            </p>
            {isLoading ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="skeleton h-24" />
                <div className="skeleton h-24" />
                <div className="skeleton h-12 col-span-2" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-5 pill border border-ink-black bg-paper-white">
                    <div className="eyebrow text-muted-foreground">Interest Rate</div>
                    <div className={`mt-2 font-heading text-3xl font-light tabular ${creditScore === 0 ? "text-destructive" : ""}`}>
                      {loanTerms.interestRate}
                    </div>
                  </div>
                  <div className="p-5 pill border border-ink-black bg-paper-white">
                    <div className="eyebrow text-muted-foreground">Max Borrow</div>
                    <div className={`mt-2 font-heading text-3xl font-light tabular ${creditScore === 0 ? "text-destructive" : ""}`}>
                      {loanTerms.maxBorrow}
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <label htmlFor="txhash" className="eyebrow text-muted-foreground block mb-2">
                    Sepolia tx hash (optional — defaults to demo tx)
                  </label>
                  <input
                    id="txhash"
                    type="text"
                    placeholder="0x..."
                    value={txHashInput}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTxHashInput(e.target.value)}
                    disabled={isVerifying}
                    className="font-label text-sm w-full px-4 py-3 pill border border-ink-black bg-paper-white focus:outline-none focus:border-2 disabled:opacity-50"
                  />
                </div>

                {creditScore === 0 ? (
                  <button
                    onClick={() => handleImportRepayment()}
                    disabled={isVerifying}
                    className="mt-4 w-full font-ui text-base uppercase tracking-[0.1em] px-6 py-3 pill bg-eclipse-green text-ink-black border border-ink-black hover:border-2 transition-all disabled:opacity-50"
                  >
                    {isVerifying ? (
                      <><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Verifying...</>
                    ) : (
                      <><Network className="h-4 w-4 inline mr-2" />Import Repayment History</>
                    )}
                  </button>
                ) : (
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={handleTakeLoan}
                      disabled={isTakingLoan || (walletAddress ? wrongChain : false)}
                      className="flex-1 font-ui text-base uppercase tracking-[0.1em] px-6 py-3 pill bg-eclipse-green text-ink-black border border-ink-black hover:border-2 transition-all disabled:opacity-50"
                    >
                      {isTakingLoan ? (
                        <><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Issuing...</>
                      ) : (
                        <>Take Loan at {loanTerms.interestRate} →</>
                      )}
                    </button>
                    <button
                      onClick={() => handleImportRepayment()}
                      disabled={isVerifying}
                      className="font-ui text-base uppercase tracking-[0.1em] px-6 py-3 pill bg-paper-white text-ink-black border border-ink-black hover:bg-eclipse-green transition-colors disabled:opacity-50"
                    >
                      {isVerifying ? (
                        <Loader2 className="h-4 w-4 animate-spin inline" />
                      ) : (
                        <>Import More</>
                      )}
                    </button>
                  </div>
                )}
                {creditScore > 0 && (
                  <p className="mt-3 font-ui text-xs text-muted-foreground">
                    {walletAddress && wrongChain
                      ? "Wrong network. Click \"Wrong Network\" in the header to switch to Creditcoin testnet."
                      : walletAddress
                        ? "You will sign the loan transaction with your connected wallet on Creditcoin testnet."
                        : "Without a connected wallet, the loan is issued via a demo relayer. Connect your wallet to borrow with your own address."}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Verification progress */}
        {isVerifying && (
          <div className="mb-20 p-8 pill border border-ink-black bg-eclipse-green/10 animate-in">
            <div className="eyebrow text-ink-black mb-2">Attestcoin Protocol Verification</div>
            <p className="font-ui text-sm text-muted-foreground mb-6">
              Cryptographically verifying your Sepolia repayment on Creditcoin — no oracle required.
            </p>
            <div className="space-y-3">
              {verificationSteps.map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  {step.status === "done" ? (
                    <CheckCircle2 className="h-5 w-5 text-ink-black" aria-hidden="true" />
                  ) : step.status === "active" ? (
                    <Loader2 className="h-5 w-5 animate-spin text-ink-black" aria-hidden="true" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-ink-black/30" aria-hidden="true" />
                  )}
                  <span className={`font-ui text-sm ${step.status === "done" ? "text-muted-foreground line-through" : step.status === "active" ? "font-bold" : "text-muted-foreground/50"}`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* How it works — 3 step cards */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <div className="eyebrow text-ink-black">How It Works</div>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <div className="p-8 pill border border-ink-black bg-paper-white">
              <div className="font-heading text-5xl font-light mb-4">01</div>
              <h3 className="font-ui text-lg font-bold uppercase tracking-wide mb-2">Repay on Ethereum</h3>
              <p className="font-ui text-sm text-muted-foreground">
                Borrowers repay loans on Sepolia. The transaction is recorded on-chain — nothing special, just a normal tx.
              </p>
            </div>
            <div className="p-8 pill border border-ink-black bg-eclipse-green eclipse-glow">
              <div className="font-heading text-5xl font-light mb-4">02</div>
              <h3 className="font-ui text-lg font-bold uppercase tracking-wide mb-2">Verify via Attestcoin</h3>
              <p className="font-ui text-sm text-ink-black">
                A cryptographic proof of the Sepolia tx is generated and verified on Creditcoin through the BlockProver precompile.
              </p>
            </div>
            <div className="p-8 pill border border-ink-black bg-paper-white">
              <div className="font-heading text-5xl font-light mb-4">03</div>
              <h3 className="font-ui text-lg font-bold uppercase tracking-wide mb-2">Borrow Better</h3>
              <p className="font-ui text-sm text-muted-foreground">
                Verified repayments become a credit score on Creditcoin, unlocking lower interest rates and higher borrowing limits.
              </p>
            </div>
          </div>
        </div>

        {/* Tabs — Repayment History / Active Loans */}
        <div className="mb-20">
          <div className="flex gap-2 mb-6 border-b border-ink-black">
            <button className="font-ui text-sm uppercase tracking-[0.1em] px-5 py-3 border-b-2 border-ink-black font-bold">
              Repayment History
            </button>
            <button className="font-ui text-sm uppercase tracking-[0.1em] px-5 py-3 border-b-2 border-transparent text-muted-foreground hover:text-ink-black">
              Active Loans
            </button>
          </div>

          {/* Repayment History tab content */}
          <div>
            {isLoading ? (
              <div className="space-y-3">
                <div className="skeleton h-20" />
                <div className="skeleton h-20" />
                <div className="skeleton h-20" />
              </div>
            ) : repaymentHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center p-8 pill border border-ink-black">
                <Clock className="mb-3 h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
                <p className="font-ui text-sm text-muted-foreground">
                  No repayments verified yet. Import your repayment history to build your credit score.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {repaymentHistory.map((record, i) => (
                  <div
                    key={i}
                    className="flex flex-col gap-3 p-5 pill border border-ink-black bg-paper-white sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-eclipse-green">
                        <CheckCircle2 className="h-5 w-5 text-ink-black" aria-hidden="true" />
                      </div>
                      <div>
                        <div className="font-ui text-sm font-bold">
                          Repaid {record.amount}
                        </div>
                        <div className="font-label text-xs text-muted-foreground">
                          Loan #{record.loanId} · {record.chain} · {record.timestamp}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-ui text-xs uppercase tracking-[0.1em] px-3 py-1 pill border border-ink-black bg-eclipse-green">
                        Verified
                      </span>
                      <span className="font-label text-xs text-muted-foreground">
                        {record.txHash}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Loans (always rendered, hidden via CSS) */}
          {loans.length > 0 && (
            <div className="mt-6 space-y-3">
              {loans.map((loan, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-3 p-5 pill border border-ink-black bg-paper-white sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ink-black">
                      <Coins className="h-5 w-5 text-ink-black" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="font-ui text-sm font-bold">
                        Borrowed {loan.principal}
                      </div>
                      <div className="font-label text-xs text-muted-foreground">
                        Loan #{loan.loanId} · {loan.interestRate} APR · Collateral: {loan.collateral}
                      </div>
                    </div>
                  </div>
                  <span className="font-ui text-xs uppercase tracking-[0.1em] px-3 py-1 pill border border-ink-black">
                    {loan.status === "active" ? "Active" : "Repaid"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer — full-bleed black band */}
      <footer className="bg-ink-black text-paper-white">
        <div className="mx-auto max-w-[1200px] px-5 py-20">
          <div className="flex flex-col md:flex-row justify-between gap-10">
            <div>
              <div className="font-ui text-2xl font-bold uppercase tracking-tight mb-4">CreditPass</div>
              <p className="font-ui text-sm text-paper-white/60 max-w-xs">
                Cross-chain credit passport powered by the Attestcoin Protocol.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="eyebrow text-paper-white mb-2">Links</div>
              <a href="https://github.com/DruxAMB/creditpass" target="_blank" rel="noopener noreferrer" className="font-ui text-sm uppercase tracking-[0.1em] hover:text-eclipse-green transition-colors">
                GitHub →
              </a>
              <a href="https://creditcoin-testnet.blockscout.com" target="_blank" rel="noopener noreferrer" className="font-ui text-sm uppercase tracking-[0.1em] hover:text-eclipse-green transition-colors">
                Blockscout →
              </a>
              <a href="https://www.attestcoin.com" target="_blank" rel="noopener noreferrer" className="font-ui text-sm uppercase tracking-[0.1em] hover:text-eclipse-green transition-colors">
                Attestcoin Protocol →
              </a>
            </div>
          </div>
          <div className="mt-16 pt-8 border-t border-paper-white/20">
            <p className="font-label text-xs text-paper-white/40 uppercase tracking-[0.2em]">
              Built for Creditcoin Hackathon · 2025
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function getScoreTier(score: number) {
  if (score >= 900) return { label: "Platinum", badgeClass: "bg-eclipse-green text-ink-black" };
  if (score >= 750) return { label: "Gold", badgeClass: "bg-eclipse-green text-ink-black" };
  if (score >= 600) return { label: "Silver", badgeClass: "bg-paper-white text-ink-black" };
  if (score >= 300) return { label: "Bronze", badgeClass: "bg-paper-white text-ink-black" };
  return { label: "No History", badgeClass: "bg-paper-white text-ink-black" };
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
