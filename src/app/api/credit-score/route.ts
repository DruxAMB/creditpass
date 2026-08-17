import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { CREDIT_PASS_ABI } from "@/lib/abis";
import { friendlyError } from "@/lib/errors";

const CREDITPASS_ADDRESS = "0xb3FCCC7E689c80d49174E1F057A17C688c7aF196";
const CREDITCOIN_RPC = "https://rpc.cc3-testnet.creditcoin.network";
const DEFAULT_BORROWER = "0x403aA1395c3E1221Cb14Fa10643063584f76c8ec";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const borrower = searchParams.get("address") || DEFAULT_BORROWER;

    const provider = new ethers.JsonRpcProvider(CREDITCOIN_RPC);
    const creditPass = new ethers.Contract(
      CREDITPASS_ADDRESS,
      CREDIT_PASS_ABI,
      provider
    );

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
      { error: friendlyError(error, "Loading credit score") },
      { status: 500 }
    );
  }
}
