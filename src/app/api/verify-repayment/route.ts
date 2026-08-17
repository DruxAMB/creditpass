import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { blockProver, proofProvider, chainInfo } from "@gluwa/usc-sdk";
import { CREDIT_PASS_ABI } from "@/lib/abis";

const SEPOLIA_CHAIN_KEY = 1;
const PROOF_BUILDER_URL = "https://prover.cc3-testnet.creditcoin.network";
const CREDITPASS_ADDRESS = "0xb3FCCC7E689c80d49174E1F057A17C688c7aF196";
const CREDITCOIN_RPC = "https://rpc.cc3-testnet.creditcoin.network";
const SEPOLIA_RPC = `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY || "0a01199d41094205a22eb92865d61bf5"}`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { txHash, borrowerAddress } = body;

    if (!txHash) {
      return NextResponse.json(
        { error: "txHash is required" },
        { status: 400 }
      );
    }

    const borrower = borrowerAddress || "0x403aA1395c3E1221Cb14Fa10643063584f76c8ec";

    // Setup providers
    const sepoliaProvider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
    const creditcoinProvider = new ethers.JsonRpcProvider(CREDITCOIN_RPC);

    // Get tx receipt from Sepolia
    const receipt = await sepoliaProvider.getTransactionReceipt(txHash);
    if (!receipt) {
      return NextResponse.json(
        { error: "Transaction not found on Sepolia" },
        { status: 404 }
      );
    }

    if (receipt.status !== 1) {
      return NextResponse.json(
        { error: "Transaction failed on Sepolia" },
        { status: 400 }
      );
    }

    // Setup Creditcoin components
    const prover = new blockProver.PrecompileBlockProver(creditcoinProvider);
    const proofBuilder = new proofProvider.service.ProofBuilder(SEPOLIA_CHAIN_KEY, PROOF_BUILDER_URL);

    // Wait for block to be attested
    await proofBuilder.waitUntilHeightAttested(SEPOLIA_CHAIN_KEY, receipt.blockNumber);

    // Generate proof
    const proofResult = await proofBuilder.getProof(txHash);
    if (!proofResult.success || !proofResult.data) {
      return NextResponse.json(
        { error: `Proof generation failed: ${proofResult.error}` },
        { status: 500 }
      );
    }

    const proofData = proofResult.data;

    // Verify proof on-chain (read-only check first)
    const verificationResult = await prover.verifySingle(
      proofData.chainKey,
      proofData.headerNumber,
      proofData.txBytes,
      proofData.merkleProof,
      proofData.continuityProof
    );

    if (!verificationResult) {
      return NextResponse.json(
        { error: "Proof verification failed on BlockProver precompile" },
        { status: 500 }
      );
    }

    // Submit verification tx (verifyAndEmitSingle)
    const wallet = new ethers.Wallet(
      (process.env.DEPLOYER_PRIVATE_KEY || "").trim(),
      creditcoinProvider
    );

    const verifyTx = await prover.verifyAndEmitSingle(
      wallet,
      proofData.chainKey,
      proofData.headerNumber,
      proofData.txBytes,
      proofData.merkleProof,
      proofData.continuityProof
    );
    const verifyReceipt = await verifyTx.wait();
    if (!verifyReceipt) {
      return NextResponse.json({ error: "Verification tx receipt is null" }, { status: 500 });
    }

    // Record repayment on CreditPass contract
    const creditPass = new ethers.Contract(
      CREDITPASS_ADDRESS,
      CREDIT_PASS_ABI,
      wallet
    );

    const sepTx = await sepoliaProvider.getTransaction(txHash);
    if (!sepTx) {
      return NextResponse.json({ error: "Transaction data not found on Sepolia" }, { status: 404 });
    }
    const amount = sepTx.value;

    const recordTx = await creditPass.recordRepayment(
      0, // loanId
      borrower, // borrower address from request
      amount,
      txHash,
      proofData.chainKey,
      proofData.headerNumber
    );
    const recordReceipt = await recordTx.wait();

    // Get updated score
    const [score, verifiedRepayments, totalVerifiedAmount] =
      await creditPass.getCreditScore(borrower);
    const tier = await creditPass.getScoreTier(score);

    return NextResponse.json({
      success: true,
      verificationTxHash: verifyReceipt.hash,
      recordTxHash: recordReceipt.hash,
      blockHeight: proofData.headerNumber,
      txIndex: proofData.txIndex,
      score: Number(score),
      verifiedRepayments: Number(verifiedRepayments),
      totalVerifiedAmount: ethers.formatEther(totalVerifiedAmount),
      tier,
    });
  } catch (error) {
    console.error("Verification failed:", error);
    const rawMsg = error instanceof Error ? error.message : "Verification failed";

    // Check for known contract reverts
    if (rawMsg.includes("Transaction already verified")) {
      return NextResponse.json(
        { error: "This transaction has already been verified and recorded. Try a different Sepolia tx hash." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: rawMsg },
      { status: 500 }
    );
  }
}
