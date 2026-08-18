const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "tCTC");

  // Deploy CreditPass
  const CreditPass = await hre.ethers.getContractFactory("CreditPass");
  const creditPass = await CreditPass.deploy();
  await creditPass.waitForDeployment();
  const creditPassAddr = await creditPass.getAddress();
  console.log("CreditPass deployed to:", creditPassAddr);

  // Deploy CreditLender (depends on CreditPass)
  const CreditLender = await hre.ethers.getContractFactory("CreditLender");
  const creditLender = await CreditLender.deploy(creditPassAddr);
  await creditLender.waitForDeployment();
  const creditLenderAddr = await creditLender.getAddress();
  console.log("CreditLender deployed to:", creditLenderAddr);

  // Deploy CreditPassNFT (soulbound credit passport)
  const CreditPassNFT = await hre.ethers.getContractFactory("CreditPassNFT");
  const nft = await CreditPassNFT.deploy();
  await nft.waitForDeployment();
  const nftAddr = await nft.getAddress();
  console.log("CreditPassNFT deployed to:", nftAddr);

  // Link: NFT -> CreditPass (authorize CreditPass to mint)
  const tx1 = await nft.setCreditPass(creditPassAddr);
  await tx1.wait();
  console.log("NFT.setCreditPass() done");

  // Link: CreditPass -> NFT (authorize NFT to receive updates)
  const tx2 = await creditPass.setNFTContract(nftAddr);
  await tx2.wait();
  console.log("CreditPass.setNFTContract() done");

  console.log("\n--- Deployment Summary ---");
  console.log("CreditPass:", creditPassAddr);
  console.log("CreditLender:", creditLenderAddr);
  console.log("CreditPassNFT:", nftAddr);
  console.log("\nUpdate .env.local with:");
  console.log("CREDITPASS_ADDRESS=" + creditPassAddr);
  console.log("CREDIT_LENDER_ADDRESS=" + creditLenderAddr);
  console.log("CREDITPASS_NFT_ADDRESS=" + nftAddr);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
