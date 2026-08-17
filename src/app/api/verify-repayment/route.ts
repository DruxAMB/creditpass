import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { blockProver, proofProvider, chainInfo } from "@gluwa/usc-sdk";
import { CREDIT_PASS_ABI } from "@/lib/abis";
import { CONTRACTS, NETWORKS } from "@/lib/contracts";

const SEPOLIA_CHAIN_KEY = 1;
const PROOF_BUILDER_URL = "https://prover.cc3-testnet.creditcoin.network";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { txHash } = body;

    if (!txHash) {
      return NextResponse.json(
        { error: "txHash is required" },
        { status: 400 }
      );
    }

    // Setup providers
    const sepoliaProvider = new ethers.JsonRpcProvider(NETWORKS.SEPOLIA.rpcUrl);
    const creditcoinProvider = new ethers.JsonRpcProvider(NETWORKS.CREDITCOIN.rpcUrl);

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
      process.env.DEPLOYER_PRIVATE_KEY || "",
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
      CONTRACTS.CREDIT_PASS,
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
      wallet.address, // borrower
      amount,
      txHash,
      proofData.chainKey,
      proofData.headerNumber
    );
    const recordReceipt = await recordTx.wait();

    // Get updated score
    const [score, verifiedRepayments, totalVerifiedAmount] =
      await creditPass.getCreditScore(wallet.address);
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Verification failed" },
      { status: 500 }
    );
  }
}
