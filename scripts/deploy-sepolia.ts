import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Deploy LoanSource
  const LoanSource = await ethers.getContractFactory("LoanSource");
  const loanSource = await LoanSource.deploy();
  await loanSource.waitForDeployment();
  const loanSourceAddr = await loanSource.getAddress();
  console.log("LoanSource deployed to:", loanSourceAddr);

  // Create a test loan and repay it
  const borrower = deployer.address;
  const tx1 = await loanSource.createLoan(borrower, ethers.parseEther("5"), 30);
  await tx1.wait();
  console.log("Test loan created (loanId: 0)");

  const tx2 = await loanSource.repay(0, { value: ethers.parseEther("5") });
  await tx2.wait();
  console.log("Test loan repaid (loanId: 0)");

  console.log("\n--- Deployment Summary ---");
  console.log("LoanSource:", loanSourceAddr);
  console.log("Sepolia tx hash (repayment):", tx2.hash);
  console.log("\nUpdate .env.local with LOAN_SOURCE_ADDRESS=" + loanSourceAddr);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
