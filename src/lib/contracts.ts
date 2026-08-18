export const CONTRACTS = {
  LOAN_SOURCE: process.env.LOAN_SOURCE_ADDRESS || "0xb3FCCC7E689c80d49174E1F057A17C688c7aF196",
  CREDIT_PASS: process.env.CREDITPASS_ADDRESS || "0x3e442bF5A50ddC63aE0fc0c683190CaCa5F00283",
  CREDIT_LENDER: process.env.CREDIT_LENDER_ADDRESS || "0x9620FeB1Da3F8c7FB8a71792ffacFe94A9C6976c",
  CREDIT_PASS_NFT: process.env.CREDITPASS_NFT_ADDRESS || "0x1ff805F471b9e59784BA349F7660099C0dcBDB5a",
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
