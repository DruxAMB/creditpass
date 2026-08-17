const hre = require("hardhat");
const { blockProver, proofProvider, chainInfo, utils } = require("@gluwa/usc-sdk");

async function main() {
  const txHash = process.env.SEPOLIA_TX_HASH;
  if (!txHash) {
    console.error("Set SEPOLIA_TX_HASH in .env.local to the repayment tx hash");
    process.exit(1);
  }

  const creditcoinRpcUrl = "https://rpc.cc3-testnet.creditcoin.network";
  const proofBuilderUrl = "https://prover.cc3-testnet.creditcoin.network";

  // Get the block height of the tx from Sepolia
  const sepoliaProvider = new hre.ethers.JsonRpcProvider(
    `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`
  );
  const receipt = await sepoliaProvider.getTransactionReceipt(txHash);
  if (!receipt) {
    console.error("Transaction not found on Sepolia:", txHash);
    process.exit(1);
  }
  console.log("Sepolia tx block:", receipt.blockNumber);
  console.log("Sepolia tx status:", receipt.status === 1 ? "SUCCESS" : "FAILED");

  // Setup Creditcoin components
  const creditcoinProvider = new hre.ethers.JsonRpcProvider(creditcoinRpcUrl);
  const chainInfoProvider = new chainInfo.PrecompileChainInfoProvider(creditcoinProvider);
  const prover = new blockProver.PrecompileBlockProver(creditcoinProvider);

  // Get supported chains
  const supportedChains = await chainInfoProvider.getSupportedChains();
  console.log("Supported chains:", supportedChains.map(c => ({ chainKey: c.chainKey, name: c.name })));

  // Find Sepolia chain key - chain key 1 is Sepolia on Creditcoin testnet
  const supportedChainKeys = supportedChains.map(c => c.chainKey);
  console.log("Available chain keys:", supportedChainKeys);

  // Chain key 1 = Sepolia on Creditcoin testnet (attested height ~11.5M matches Sepolia)
  let chainKey = 1;
  console.log("Using chain key:", chainKey);

  // Wait for the block to be attested using the proof builder's own wait method
  const apiProvider = new proofProvider.service.ProofBuilder(chainKey, proofBuilderUrl);
  console.log("Waiting for block", receipt.blockNumber, "to be attested on proof builder...");
  try {
    await apiProvider.waitUntilHeightAttested(chainKey, receipt.blockNumber);
    console.log("Block attested in proof builder!");
  } catch (err) {
    console.error("Error waiting for attestation:", err.message);
    console.log("Continuing anyway — the block may already be attested");
  }

  // Generate proof
  console.log("Generating proof for tx:", txHash);
  const proofResult = await apiProvider.getProof(txHash);

  if (!proofResult.success || !proofResult.data) {
    console.error("Proof generation failed:", proofResult.error);
    process.exit(1);
  }

  const proofData = proofResult.data;
  console.log("Proof generated successfully!");
  console.log("  Chain key:", proofData.chainKey);
  console.log("  Header number:", proofData.headerNumber);

  // Verify the proof on-chain (read-only)
  console.log("Verifying proof on Creditcoin...");
  const verificationResult = await prover.verifySingle(
    proofData.chainKey,
    proofData.headerNumber,
    proofData.txBytes,
    proofData.merkleProof,
    proofData.continuityProof
  );

  console.log("Proof verification:", verificationResult ? "SUCCESS" : "FAILED");

  if (verificationResult) {
    // Now emit the verification on-chain using verifyAndEmitSingle
    const [signer] = await hre.ethers.getSigners();
    console.log("Submitting verification tx from:", signer.address);

    const tx = await prover.verifyAndEmitSingle(
      signer,
      proofData.chainKey,
      proofData.headerNumber,
      proofData.txBytes,
      proofData.merkleProof,
      proofData.continuityProof
    );

    const txReceipt = await tx.wait();
    console.log("Verification emitted! Tx hash:", txReceipt.hash);
    console.log("Gas used:", txReceipt.gasUsed.toString());

    // Parse TransactionVerified event
    for (const log of txReceipt.logs) {
      try {
        const parsed = prover.blockProverContract.interface.parseLog(log);
        if (parsed && parsed.name === "TransactionVerified") {
          console.log("TransactionVerified event:", {
            chainKey: parsed.args[0].toString(),
            height: parsed.args[1].toString(),
            txIndex: parsed.args[2].toString()
          });
        }
      } catch (e) {
        // skip unparseable logs
      }
    }

    // Now call recordRepayment on CreditPass contract
    const creditPassAddr = process.env.CREDITPASS_ADDRESS;
    if (creditPassAddr) {
      console.log("\nRecording repayment on CreditPass contract...");
      const CreditPass = await hre.ethers.getContractFactory("CreditPass");
      const creditPass = CreditPass.attach(creditPassAddr).connect(signer);

      // Get the repayment amount from the Sepolia tx
      const sepTx = await sepoliaProvider.getTransaction(txHash);
      const amount = sepTx.value;

      const recordTx = await creditPass.recordRepayment(
        0, // loanId
        signer.address, // borrower
        amount,
        txHash,
        proofData.chainKey,
        proofData.headerNumber
      );
      const recordReceipt = await recordTx.wait();
      console.log("Repayment recorded! Tx hash:", recordReceipt.hash);

      // Check updated credit score
      const [score, repayments, totalAmount, lastUpdated] = await creditPass.getCreditScore(signer.address);
      console.log("\n--- Credit Score Updated ---");
      console.log("Score:", score.toString());
      console.log("Verified repayments:", repayments.toString());
      console.log("Total verified amount:", hre.ethers.formatEther(totalAmount), "ETH");
      console.log("Tier:", await creditPass.getScoreTier(score));
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
