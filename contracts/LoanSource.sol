// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title LoanSource
 * @dev Mock lending contract on Ethereum Sepolia that records loan repayments.
 * The Attestcoin Protocol verifies transactions from this contract on Creditcoin.
 */
contract LoanSource {
    struct Loan {
        address borrower;
        uint256 amount;
        uint256 dueDate;
        bool repaid;
    }

    mapping(uint256 => Loan) public loans;
    uint256 public nextLoanId;

    event LoanCreated(uint256 indexed loanId, address indexed borrower, uint256 amount, uint256 dueDate);
    event Repayment(uint256 indexed loanId, address indexed borrower, uint256 amount, uint256 timestamp);

    function createLoan(address borrower, uint256 amount, uint256 durationDays) external returns (uint256 loanId) {
        loanId = nextLoanId++;
        loans[loanId] = Loan({
            borrower: borrower,
            amount: amount,
            dueDate: block.timestamp + (durationDays * 1 days),
            repaid: false
        });
        emit LoanCreated(loanId, borrower, amount, loans[loanId].dueDate);
    }

    function repay(uint256 loanId) external payable {
        Loan storage loan = loans[loanId];
        require(!loan.repaid, "Loan already repaid");
        require(msg.value >= loan.amount, "Insufficient repayment");
        require(msg.sender == loan.borrower, "Only borrower can repay");

        loan.repaid = true;
        emit Repayment(loanId, loan.borrower, loan.amount, block.timestamp);
    }

    function getRepaymentData(uint256 loanId) external view returns (address borrower, uint256 amount, bool repaid) {
        Loan storage loan = loans[loanId];
        return (loan.borrower, loan.amount, loan.repaid);
    }
}
