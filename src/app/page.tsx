"use client";

import { useState, useCallback } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  const scoreTier = getScoreTier(creditScore);
  const loanTerms = getLoanTerms(creditScore);

  const handleImportRepayment = useCallback(async () => {
    setIsVerifying(true);
    setVerificationSteps([
      { label: "Fetching Sepolia transaction data", status: "active" },
      { label: "Generating cross-chain proof via Attestcoin Protocol", status: "pending" },
      { label: "Submitting proof to BlockProver precompile", status: "pending" },
      { label: "Verifying block header on Creditcoin", status: "pending" },
      { label: "Decoding verified transaction data", status: "pending" },
      { label: "Updating credit score on-chain", status: "pending" },
    ]);

    await sleep(800);
    setVerificationSteps((prev) => [
      { label: "Fetching Sepolia transaction data", status: "done" },
      { label: "Generating cross-chain proof via Attestcoin Protocol", status: "active" },
      { label: "Submitting proof to BlockProver precompile", status: "pending" },
      { label: "Verifying block header on Creditcoin", status: "pending" },
      { label: "Decoding verified transaction data", status: "pending" },
      { label: "Updating credit score on-chain", status: "pending" },
    ]);

    await sleep(1000);
    setVerificationSteps((prev) => [
      { label: "Fetching Sepolia transaction data", status: "done" },
      { label: "Generating cross-chain proof via Attestcoin Protocol", status: "done" },
      { label: "Submitting proof to BlockProver precompile", status: "active" },
      { label: "Verifying block header on Creditcoin", status: "pending" },
      { label: "Decoding verified transaction data", status: "pending" },
      { label: "Updating credit score on-chain", status: "pending" },
    ]);

    await sleep(1200);
    setVerificationSteps((prev) => [
      { label: "Fetching Sepolia transaction data", status: "done" },
      { label: "Generating cross-chain proof via Attestcoin Protocol", status: "done" },
      { label: "Submitting proof to BlockProver precompile", status: "done" },
      { label: "Verifying block header on Creditcoin", status: "active" },
      { label: "Decoding verified transaction data", status: "pending" },
      { label: "Updating credit score on-chain", status: "pending" },
    ]);

    await sleep(1000);
    setVerificationSteps((prev) => [
      { label: "Fetching Sepolia transaction data", status: "done" },
      { label: "Generating cross-chain proof via Attestcoin Protocol", status: "done" },
      { label: "Submitting proof to BlockProver precompile", status: "done" },
      { label: "Verifying block header on Creditcoin", status: "done" },
      { label: "Decoding verified transaction data", status: "active" },
      { label: "Updating credit score on-chain", status: "pending" },
    ]);

    await sleep(800);
    setVerificationSteps((prev) => [
      { label: "Fetching Sepolia transaction data", status: "done" },
      { label: "Generating cross-chain proof via Attestcoin Protocol", status: "done" },
      { label: "Submitting proof to BlockProver precompile", status: "done" },
      { label: "Verifying block header on Creditcoin", status: "done" },
      { label: "Decoding verified transaction data", status: "done" },
      { label: "Updating credit score on-chain", status: "active" },
    ]);

    await sleep(600);
    setVerificationSteps((prev) => [
      { label: "Fetching Sepolia transaction data", status: "done" },
      { label: "Generating cross-chain proof via Attestcoin Protocol", status: "done" },
      { label: "Submitting proof to BlockProver precompile", status: "done" },
      { label: "Verifying block header on Creditcoin", status: "done" },
      { label: "Decoding verified transaction data", status: "done" },
      { label: "Updating credit score on-chain", status: "done" },
    ]);

    setCreditScore(750);
    setVerifiedRepayments(1);
    setTotalVerifiedAmount("5.0");
    setHasImported(true);
    setRepaymentHistory([
      {
        loanId: 0,
        amount: "5.0 ETH",
        txHash: "0x4a2b...8f3c",
        timestamp: "Aug 17, 2026",
        chain: "Sepolia",
      },
    ]);

    await sleep(500);
    setIsVerifying(false);
  }, []);

  const handleTakeLoan = useCallback(async () => {
    const newLoan: LoanRecord = {
      loanId: loans.length,
      principal: "50 tCTC",
      interestRate: "8%",
      collateral: "25 tCTC",
      status: "active",
    };
    setLoans((prev) => [...prev, newLoan]);
  }, [loans.length]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <header className="border-b border-white/10 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
            <span className="text-lg font-bold tracking-tight">CreditPass</span>
            <Badge variant="secondary" className="ml-2 text-xs">
              Powered by Attestcoin Protocol
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm text-slate-400">
              <Wallet className="h-4 w-4" />
              <span className="font-mono">0x4a2b...8f3c</span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="border-white/10 bg-white/5 backdrop-blur lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <TrendingUp className="h-4 w-4" />
                Credit Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-3">
                <div className="relative flex h-32 w-32 items-center justify-center rounded-full border-4 border-white/10">
                  <div className="text-center">
                    <div className="text-3xl font-bold">{creditScore}</div>
                    <div className="text-xs text-slate-400">/ 950</div>
                  </div>
                </div>
                <Badge className={`${scoreTier.badgeClass} border-0`}>
                  {scoreTier.label}
                </Badge>
                <div className="flex gap-4 text-center">
                  <div>
                    <div className="text-lg font-semibold">{verifiedRepayments}</div>
                    <div className="text-xs text-slate-400">Verified Repayments</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{totalVerifiedAmount} ETH</div>
                    <div className="text-xs text-slate-400">Total Verified</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 backdrop-blur lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <Coins className="h-4 w-4" />
                Available Loan Terms
              </CardTitle>
              <CardDescription className="text-slate-500">
                {creditScore === 0
                  ? "No credit history verified. Import your repayment history to unlock better terms."
                  : "Terms based on your verified cross-chain credit score."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Percent className="h-3 w-3" />
                    Interest Rate
                  </div>
                  <div className={`mt-1 text-2xl font-bold ${creditScore === 0 ? "text-red-400" : "text-emerald-400"}`}>
                    {loanTerms.interestRate}
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Coins className="h-3 w-3" />
                    Max Borrow
                  </div>
                  <div className={`mt-1 text-2xl font-bold ${creditScore === 0 ? "text-red-400" : "text-emerald-400"}`}>
                    {loanTerms.maxBorrow}
                  </div>
                </div>
              </div>

              {creditScore === 0 ? (
                <Button
                  onClick={handleImportRepayment}
                  disabled={isVerifying}
                  className="mt-4 w-full bg-emerald-600 text-white hover:bg-emerald-500"
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
                <div className="mt-4 flex gap-2">
                  <Button
                    onClick={handleTakeLoan}
                    className="flex-1 bg-emerald-600 text-white hover:bg-emerald-500"
                    size="lg"
                  >
                    Take Loan at {loanTerms.interestRate}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  {!hasImported || verifiedRepayments < 2 ? (
                    <Button
                      onClick={handleImportRepayment}
                      disabled={isVerifying}
                      variant="outline"
                      className="border-white/20 bg-transparent text-white hover:bg-white/10"
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
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {isVerifying && (
          <Card className="mb-8 border-emerald-500/30 bg-emerald-950/20 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-emerald-300">
                <Network className="h-4 w-4" />
                Attestcoin Protocol Verification
              </CardTitle>
              <CardDescription className="text-slate-400">
                Cryptographically verifying your Sepolia repayment on Creditcoin — no oracle required.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {verificationSteps.map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {step.status === "done" ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    ) : step.status === "active" ? (
                      <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-slate-700" />
                    )}
                    <span
                      className={`text-sm ${
                        step.status === "done"
                          ? "text-slate-400 line-through"
                          : step.status === "active"
                            ? "text-white font-medium"
                            : "text-slate-600"
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

        <Tabs defaultValue="history" className="w-full">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="history" className="data-[state=active]:bg-white/10">
              Repayment History
            </TabsTrigger>
            <TabsTrigger value="loans" className="data-[state=active]:bg-white/10">
              Active Loans
            </TabsTrigger>
            <TabsTrigger value="how" className="data-[state=active]:bg-white/10">
              How It Works
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="mt-4">
            <Card className="border-white/10 bg-white/5 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-slate-300">
                  Verified Cross-Chain Repayments
                </CardTitle>
              </CardHeader>
              <CardContent>
                {repaymentHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Clock className="mb-2 h-8 w-8 text-slate-600" />
                    <p className="text-sm text-slate-500">
                      No repayments verified yet. Import your repayment history to build your credit score.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {repaymentHistory.map((record, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
                            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                          </div>
                          <div>
                            <div className="text-sm font-medium">
                              Repaid {record.amount}
                            </div>
                            <div className="text-xs text-slate-400">
                              Loan #{record.loanId} · {record.chain} · {record.timestamp}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
                            Verified On-Chain
                          </Badge>
                          <span className="font-mono text-xs text-slate-500">
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
            <Card className="border-white/10 bg-white/5 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-slate-300">
                  Your Loans on Creditcoin
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loans.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Lock className="mb-2 h-8 w-8 text-slate-600" />
                    <p className="text-sm text-slate-500">
                      No active loans. Build your credit score first to unlock borrowing.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {loans.map((loan, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20">
                            <Coins className="h-5 w-5 text-blue-400" />
                          </div>
                          <div>
                            <div className="text-sm font-medium">
                              Borrowed {loan.principal}
                            </div>
                            <div className="text-xs text-slate-400">
                              Loan #{loan.loanId} · {loan.interestRate} APR · Collateral: {loan.collateral}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className="border-blue-500/30 text-blue-400">
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
              <Card className="border-white/10 bg-white/5 backdrop-blur">
                <CardContent className="pt-6">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                    <span className="text-lg font-bold text-emerald-400">1</span>
                  </div>
                  <h3 className="mb-1 font-semibold">Repay on Ethereum</h3>
                  <p className="text-sm text-slate-400">
                    Borrowers repay loans on Ethereum Sepolia. The repayment transaction is recorded on-chain.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-white/5 backdrop-blur">
                <CardContent className="pt-6">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                    <span className="text-lg font-bold text-emerald-400">2</span>
                  </div>
                  <h3 className="mb-1 font-semibold">Verify via Attestcoin Protocol</h3>
                  <p className="text-sm text-slate-400">
                    The Attestcoin Protocol generates a cryptographic proof of the Sepolia transaction and verifies it
                    on Creditcoin via the BlockProver precompile — no oracle, no intermediary.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-white/5 backdrop-blur">
                <CardContent className="pt-6">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                    <span className="text-lg font-bold text-emerald-400">3</span>
                  </div>
                  <h3 className="mb-1 font-semibold">Borrow with better terms</h3>
                  <p className="text-sm text-slate-400">
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
  return { label: "No History", badgeClass: "bg-red-500/20 text-red-300" };
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
