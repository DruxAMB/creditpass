import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { CREDIT_PASS_ABI } from "@/lib/abis";
import { CONTRACTS, NETWORKS } from "@/lib/contracts";

export async function GET() {
  try {
    const provider = new ethers.JsonRpcProvider(NETWORKS.CREDITCOIN.rpcUrl);
    const creditPass = new ethers.Contract(
      CONTRACTS.CREDIT_PASS,
      CREDIT_PASS_ABI,
      provider
    );

    // Use the deployer address (derived from seed phrase)
    // For demo, we read the score of the known deployer
    const borrower = "0x403aA1395c3E1221Cb14Fa10643063584f76c8ec";

    const [score, verifiedRepayments, totalVerifiedAmount, lastUpdated] =
      await creditPass.getCreditScore(borrower);

    const repaymentCount = await creditPass.getRepaymentCount(borrower);

    const repayments = [];
    for (let i = 0; i < Number(repaymentCount); i++) {
      const [loanId, , amount, timestamp, txHash, sourceChainKey, sourceBlockHeight] =
        await creditPass.getRepaymentRecord(borrower, i);
      repayments.push({
        loanId: Number(loanId),
        amount: ethers.formatEther(amount),
        txHash: txHash,
        timestamp: new Date(Number(timestamp) * 1000).toISOString(),
        sourceChainKey: Number(sourceChainKey),
        sourceBlockHeight: Number(sourceBlockHeight),
      });
    }

    const tier = await creditPass.getScoreTier(score);

    return NextResponse.json({
      borrower,
      score: Number(score),
      verifiedRepayments: Number(verifiedRepayments),
      totalVerifiedAmount: ethers.formatEther(totalVerifiedAmount),
      lastUpdated: Number(lastUpdated),
      tier,
      repayments,
    });
  } catch (error) {
    console.error("Failed to fetch credit score:", error);
    return NextResponse.json(
      { error: "Failed to fetch credit score" },
      { status: 500 }
    );
  }
}
