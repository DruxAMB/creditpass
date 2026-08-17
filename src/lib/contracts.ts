export const CONTRACTS = {
  LOAN_SOURCE: process.env.LOAN_SOURCE_ADDRESS || "",
  CREDIT_PASS: process.env.CREDITPASS_ADDRESS || "",
  CREDIT_LENDER: process.env.CREDIT_LENDER_ADDRESS || "",
};

export const NETWORKS = {
  SEPOLIA: {
    chainId: "0xaa36a7",
    name: "Sepolia Testnet",
    rpcUrl: `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY || ""}`,
    explorer: "https://sepolia.etherscan.io",
  },
  CREDITCOIN: {
    chainId: "0x18e8f",
    name: "Creditcoin Testnet",
    rpcUrl: "https://rpc.cc3-testnet.creditcoin.network",
    explorer: "https://creditcoin-testnet.blockscout.com",
  },
};

export const USC_PRECOMPILES = {
  BLOCK_PROVER: "0x0000000000000000000000000000000000000FD2",
  CHAIN_INFO: "0x0000000000000000000000000000000000000fD3",
};

export const SEPOLIA_CHAIN_KEY = 1;
