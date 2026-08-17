import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { CREDIT_PASS_ABI } from "@/lib/abis";

const CREDITPASS_ADDRESS = "0xb3FCCC7E689c80d49174E1F057A17C688c7aF196";
const CREDITCOIN_RPC = "https://rpc.cc3-testnet.creditcoin.network";
const BORROWER_ADDRESS = "0x403aA1395c3E1221Cb14Fa10643063584f76c8ec";

export async function GET() {
  try {
    const provider = new ethers.JsonRpcProvider(CREDITCOIN_RPC);
    const creditPass = new ethers.Contract(
      CREDITPASS_ADDRESS,
      CREDIT_PASS_ABI,
      provider
    );

    const borrower = BORROWER_ADDRESS;

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
      { error: error instanceof Error ? error.message : "Failed to fetch credit score" },
      { status: 500 }
    );
  }
}
