import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "tCTC");

  // Deploy CreditPass
  const CreditPass = await ethers.getContractFactory("CreditPass");
  const creditPass = await CreditPass.deploy();
  await creditPass.waitForDeployment();
  const creditPassAddr = await creditPass.getAddress();
  console.log("CreditPass deployed to:", creditPassAddr);

  // Deploy CreditLender (depends on CreditPass)
  const CreditLender = await ethers.getContractFactory("CreditLender");
  const creditLender = await CreditLender.deploy(creditPassAddr);
  await creditLender.waitForDeployment();
  const creditLenderAddr = await creditLender.getAddress();
  console.log("CreditLender deployed to:", creditLenderAddr);

  console.log("\n--- Deployment Summary ---");
  console.log("CreditPass:", creditPassAddr);
  console.log("CreditLender:", creditLenderAddr);
  console.log("\nUpdate .env.local with:");
  console.log("CREDITPASS_ADDRESS=" + creditPassAddr);
  console.log("CREDIT_LENDER_ADDRESS=" + creditLenderAddr);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
