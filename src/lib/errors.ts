/**
 * Maps raw ethers/wallet/RPC errors to user-friendly messages.
 */

export function friendlyError(error: unknown, context: string = ""): string {
  const raw = error instanceof Error ? error.message : String(error);
  const shortMessage = error && typeof error === "object" && "shortMessage" in error
    ? String((error as { shortMessage: string }).shortMessage)
    : "";
  const reason = error && typeof error === "object" && "reason" in error
    ? String((error as { reason: string }).reason)
    : "";
  const code = error && typeof error === "object" && "code" in error
    ? (error as { code: number | string }).code
    : undefined;

  // Combined message for matching (ethers v6 puts useful info in shortMessage/reason)
  const combined = `${raw} ${shortMessage} ${reason}`;

  // Wallet rejection (user clicked "Reject" in MetaMask/Rainbow)
  if (code === 4001 || combined.includes("user rejected") || combined.includes("User denied")) {
    return "You rejected the request in your wallet. Please try again and confirm the transaction.";
  }

  // Wallet not found
  if (combined.includes("No wallet found") || combined.includes("window.ethereum") || combined.includes("No wallet detected")) {
    return "No wallet detected. Please install MetaMask or Rainbow browser extension and refresh the page.";
  }

  // Insufficient funds (check before CALL_EXCEPTION — ethers wraps this)
  if (
    combined.includes("insufficient funds") ||
    combined.includes("INSUFFICIENT_FUNDS") ||
    combined.includes("insufficient balance") ||
    combined.includes("intrinsic transaction cost") ||
    combined.includes("max fee per gas less than")
  ) {
    return "Your wallet doesn't have enough tCTC to cover the transaction cost and collateral. Get testnet tokens from a Creditcoin faucet (check creditcoin.org for faucet links).";
  }

  // Nonce issues
  if (combined.includes("nonce too low") || combined.includes("nonce has already been used")) {
    return "Transaction failed due to a nonce conflict. Try resetting your wallet account activity in your wallet settings.";
  }

  // Network / RPC errors
  if (combined.includes("fetch failed") || combined.includes("network") || combined.includes("timeout") || combined.includes("ETIMEDOUT") || combined.includes("ECONNREFUSED")) {
    return "Network error — could not reach the blockchain RPC. Please check your internet connection and try again.";
  }

  // Contract reverts — specific known reverts first
  if (combined.includes("Transaction already verified")) {
    return "This transaction has already been verified and recorded. Try a different Sepolia tx hash.";
  }

  if (combined.includes("No credit score") || combined.includes("No repayment records")) {
    return "No credit history found for this address. Verify a Sepolia repayment first to build your credit score.";
  }

  if (combined.includes("Invalid loan") || combined.includes("Loan not found")) {
    return "Loan not found on the contract. It may have been repaid or removed.";
  }

  // Contract revert with a reason string
  if (combined.includes("execution reverted") || (reason && reason !== "undefined")) {
    const reasonMatch = raw.match(/"([^"]+)"/);
    const revertReason = reason || (reasonMatch ? reasonMatch[1] : "unknown reason");
    return `Transaction was rejected by the smart contract: ${revertReason}. This may be due to insufficient collateral, an invalid loan state, or wrong contract parameters.`;
  }

  // Proof builder errors
  if (combined.includes("Proof generation failed")) {
    return "Could not generate a cryptographic proof for this transaction. The block may not be attested yet — wait a few minutes and try again.";
  }

  if (combined.includes("Block not attested") || combined.includes("height not attested")) {
    return "The Sepolia block containing this transaction hasn't been attested on Creditcoin yet. Please wait 5-10 minutes and try again.";
  }

  // Transaction not found on Sepolia
  if (combined.includes("Transaction not found") || combined.includes("transaction not found")) {
    return "Transaction not found on Sepolia. Check that you're using a valid Sepolia transaction hash.";
  }

  // Invalid address
  if (combined.includes("invalid address") || combined.includes("INVALID_ADDRESS")) {
    return "The provided wallet address is invalid. Please reconnect your wallet.";
  }

  // Chain switch errors
  if (combined.includes("wallet_switchEthereumChain") || combined.includes("wallet_addEthereumChain") || combined.includes("Unrecognized chain ID")) {
    return "Could not switch to Creditcoin testnet. Please add the network manually in your wallet settings.";
  }

  // Call exception (generic) — check after all specific patterns above
  if (combined.includes("CALL_EXCEPTION")) {
    // Try to extract any useful info from the error
    if (shortMessage) {
      return `Transaction failed: ${shortMessage}`;
    }
    return "The blockchain transaction failed. This could be due to insufficient funds, wrong network, or a contract revert. Check your wallet balance and network, then try again.";
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
