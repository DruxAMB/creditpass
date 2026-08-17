export const CONTRACTS = {
  LOAN_SOURCE: process.env.LOAN_SOURCE_ADDRESS || "0xb3FCCC7E689c80d49174E1F057A17C688c7aF196",
  CREDIT_PASS: process.env.CREDITPASS_ADDRESS || "0xb3FCCC7E689c80d49174E1F057A17C688c7aF196",
  CREDIT_LENDER: process.env.CREDIT_LENDER_ADDRESS || "0x1A69795A4C0d957e47c240BAa8DbC1f5d91290F2",
};

export const NETWORKS = {
  SEPOLIA: {
    chainId: "0xaa36a7",
    name: "Sepolia Testnet",
    rpcUrl: `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY || "0a01199d41094205a22eb92865d61bf5"}`,
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
