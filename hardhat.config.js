require("@nomicfoundation/hardhat-toolbox");
const dotenv = require("dotenv");

dotenv.config({ path: ".env.local" });

const SEED_PHRASE = process.env.SEED_PHRASE || "";
const INFURA_API_KEY = process.env.INFURA_API_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      viaIR: true,
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    sepolia: {
      url: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
      accounts: { mnemonic: SEED_PHRASE },
      chainId: 11155111,
    },
    creditcoin: {
      url: "https://rpc.cc3-testnet.creditcoin.network",
      accounts: { mnemonic: SEED_PHRASE },
      chainId: 102031,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
  },
};
