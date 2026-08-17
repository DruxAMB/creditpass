const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  // Deploy LoanSource
  const LoanSource = await hre.ethers.getContractFactory("LoanSource");
  const loanSource = await LoanSource.deploy();
  await loanSource.waitForDeployment();
  const loanSourceAddr = await loanSource.getAddress();
  console.log("LoanSource deployed to:", loanSourceAddr);

  // Create a test loan and repay it (small amount to save gas)
  const borrower = deployer.address;
  const loanAmount = hre.ethers.parseEther("0.01");
  const tx1 = await loanSource.createLoan(borrower, loanAmount, 30);
  await tx1.wait();
  console.log("Test loan created (loanId: 0, amount: 0.01 ETH)");

  const tx2 = await loanSource.repay(0, { value: loanAmount });
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
