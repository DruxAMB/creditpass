const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Using account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  const loanSourceAddr = process.env.LOAN_SOURCE_ADDRESS || "0xb3FCCC7E689c80d49174E1F057A17C688c7aF196";
  const LoanSource = await hre.ethers.getContractFactory("LoanSource");
  const loanSource = LoanSource.attach(loanSourceAddr);

  // Check next loan ID
  const nextLoanId = await loanSource.nextLoanId();
  console.log("Next loan ID:", nextLoanId.toString());

  // Create a new loan and repay it
  const loanAmount = hre.ethers.parseEther("0.01");
  const tx1 = await loanSource.createLoan(deployer.address, loanAmount, 30);
  await tx1.wait();
  const loanId = Number(nextLoanId);
  console.log(`Loan #${loanId} created (amount: 0.01 ETH)`);

  const tx2 = await loanSource.repay(loanId, { value: loanAmount });
  await tx2.wait();
  console.log(`Loan #${loanId} repaid`);
  console.log("\n--- New Repayment ---");
  console.log("Sepolia repayment tx hash:", tx2.hash);
  console.log("Loan ID:", loanId);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
