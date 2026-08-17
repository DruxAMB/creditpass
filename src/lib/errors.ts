/**
 * Maps raw ethers/wallet/RPC errors to user-friendly messages.
 */

export function friendlyError(error: unknown, context: string = ""): string {
  const raw = error instanceof Error ? error.message : String(error);
  const code = error && typeof error === "object" && "code" in error
    ? (error as { code: number | string }).code
    : undefined;

  // Wallet rejection (user clicked "Reject" in MetaMask/Rainbow)
  if (code === 4001 || raw.includes("user rejected") || raw.includes("User denied")) {
    return "You rejected the request in your wallet. Please try again and confirm the transaction.";
  }

  // Wallet not found
  if (raw.includes("No wallet found") || raw.includes("window.ethereum")) {
    return "No wallet detected. Please install MetaMask or Rainbow browser extension and refresh the page.";
  }

  // Insufficient funds
  if (raw.includes("insufficient funds") || raw.includes("INSUFFICIENT_FUNDS")) {
    return "Your wallet doesn't have enough tCTC to cover the collateral. Get testnet tokens from a Creditcoin faucet.";
  }

  // Insufficient gas / balance
  if (raw.includes("insufficient balance") || raw.includes("nonce too low")) {
    return "Transaction failed due to insufficient balance or nonce issues. Try resetting your wallet account.";
  }

  // Network / RPC errors
  if (raw.includes("fetch failed") || raw.includes("network") || raw.includes("timeout") || raw.includes("ETIMEDOUT") || raw.includes("ECONNREFUSED")) {
    return "Network error — could not reach the blockchain RPC. Please check your internet connection and try again.";
  }

  // Contract reverts
  if (raw.includes("Transaction already verified")) {
    return "This transaction has already been verified and recorded. Try a different Sepolia tx hash.";
  }

  if (raw.includes("No credit score") || raw.includes("No repayment records")) {
    return "No credit history found for this address. Verify a Sepolia repayment first to build your credit score.";
  }

  if (raw.includes("Invalid loan") || raw.includes("Loan not found")) {
    return "Loan not found on the contract. It may have been repaid or removed.";
  }

  if (raw.includes("execution reverted")) {
    // Extract revert reason if available
    const reasonMatch = raw.match(/"([^"]+)"/);
    const reason = reasonMatch ? reasonMatch[1] : "unknown reason";
    return `Transaction was rejected by the smart contract: ${reason}. This may be due to insufficient collateral or an invalid loan state.`;
  }

  // Proof builder errors
  if (raw.includes("Proof generation failed")) {
    return "Could not generate a cryptographic proof for this transaction. The block may not be attested yet — wait a few minutes and try again.";
  }

  if (raw.includes("Block not attested") || raw.includes("height not attested")) {
    return "The Sepolia block containing this transaction hasn't been attested on Creditcoin yet. Please wait 5-10 minutes and try again.";
  }

  // Transaction not found on Sepolia
  if (raw.includes("Transaction not found") || raw.includes("transaction not found")) {
    return "Transaction not found on Sepolia. Check that you're using a valid Sepolia transaction hash.";
  }

  // Invalid address
  if (raw.includes("invalid address") || raw.includes("INVALID_ADDRESS")) {
    return "The provided wallet address is invalid. Please reconnect your wallet.";
  }

  // Chain switch errors
  if (raw.includes("wallet_switchEthereumChain") || raw.includes("wallet_addEthereumChain")) {
    return "Could not switch to Creditcoin testnet. Please add the network manually in your wallet settings.";
  }

  // Call exception (generic)
  if (raw.includes("CALL_EXCEPTION")) {
    return "The blockchain call failed. This may be a temporary network issue — please try again.";
  }

  // Fallback: strip technical noise but keep some info
  const cleaned = raw
    .replace(/\(action="[^"]+",.*\)/, "")
    .replace(/\(version=[^)]+\)/, "")
    .replace(/code=[A-Z_]+,/, "")
    .trim();

  if (cleaned.length > 200) {
    return `${context ? context + " failed: " : ""}An unexpected error occurred. Please try again.`;
  }

  return context ? `${context} failed: ${cleaned}` : cleaned;
}
