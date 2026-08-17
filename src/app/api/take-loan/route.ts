import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { CREDIT_LENDER_ABI } from "@/lib/abis";
import { friendlyError } from "@/lib/errors";

const CREDIT_LENDER_ADDRESS = "0x1A69795A4C0d957e47c240BAa8DbC1f5d91290F2";
const CREDITCOIN_RPC = "https://rpc.cc3-testnet.creditcoin.network";
const BORROWER_ADDRESS = "0x403aA1395c3E1221Cb14Fa10643063584f76c8ec";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { borrowAmount, durationDays } = body;

    if (!borrowAmount || !durationDays) {
      return NextResponse.json(
        { error: "borrowAmount and durationDays are required" },
        { status: 400 }
      );
    }

    const provider = new ethers.JsonRpcProvider(CREDITCOIN_RPC);
    const wallet = new ethers.Wallet(
      (process.env.DEPLOYER_PRIVATE_KEY || "0x9a667145d476c98b74a52608457ca5ea99ded2a252cd5515743530fb76682e78").trim(),
      provider
    );

    const lender = new ethers.Contract(CREDIT_LENDER_ADDRESS, CREDIT_LENDER_ABI, wallet);

    const borrowAmountWei = ethers.parseEther(borrowAmount.toString());
    const collateralWei = ethers.parseEther((parseFloat(borrowAmount.toString()) / 2).toString());

    const tx = await lender.borrow(borrowAmountWei, durationDays, {
      value: collateralWei,
    });
    const receipt = await tx.wait();

    const loanCount = await lender.getLoanCount();
    const loanId = Number(loanCount) - 1;
    const loanData = await lender.getLoan(loanId);

    return NextResponse.json({
      success: true,
      loanId,
      txHash: receipt.hash,
      borrower: loanData[0],
      principal: ethers.formatEther(loanData[1]),
      interestRateBps: Number(loanData[2]),
      interestRate: `${Number(loanData[2]) / 100}%`,
      collateral: ethers.formatEther(loanData[3]),
      duration: Number(loanData[5]),
      repaid: loanData[6],
    });
  } catch (error) {
    console.error("Take loan error:", error);
    return NextResponse.json(
      { error: friendlyError(error, "Taking loan") },
      { status: 500 }
    );
  }
}
