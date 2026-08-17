// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title CreditLender
 * @dev Lending contract on Creditcoin that uses CreditPass credit scores
 * to determine loan terms (interest rate, max borrow amount).
 */
interface ICreditPass {
    function getCreditScore(address borrower) external view returns (uint256 score, uint256 verifiedRepayments, uint256 totalVerifiedAmount, uint256 lastUpdated);
    function getScoreTier(uint256 score) external pure returns (string memory);
}

contract CreditLender {
    ICreditPass public creditPass;

    struct Loan {
        address borrower;
        uint256 principal;
        uint256 interestRate; // in basis points (e.g., 800 = 8%)
        uint256 collateral;
        uint256 startTime;
        uint256 duration;
        bool repaid;
    }

    mapping(uint256 => Loan) public loans;
    uint256 public nextLoanId;

    event LoanIssued(uint256 indexed loanId, address indexed borrower, uint256 principal, uint256 interestRate, uint256 collateral);
    event LoanRepaid(uint256 indexed loanId, address indexed borrower, uint256 totalPaid);

    constructor(address _creditPass) {
        creditPass = ICreditPass(_creditPass);
    }

    /**
     * @dev Get loan terms for a borrower based on their credit score.
     * Higher score = lower interest rate + higher max borrow.
     */
    function getLoanTerms(address borrower) public view returns (uint256 interestRate, uint256 maxBorrow) {
        (uint256 score, , , ) = creditPass.getCreditScore(borrower);

        if (score == 0) {
            // No credit history — worst terms
            return (2000, 10 ether); // 20% APR, max 10 tCTC
        } else if (score < 600) {
            return (1500, 50 ether); // 15% APR, max 50 tCTC
        } else if (score < 750) {
            return (1200, 100 ether); // 12% APR, max 100 tCTC
        } else if (score < 900) {
            return (800, 500 ether); // 8% APR, max 500 tCTC
        } else {
            return (500, 1000 ether); // 5% APR, max 1000 tCTC
        }
    }

    /**
     * @dev Borrow against collateral. Terms determined by credit score.
     */
    function borrow(uint256 borrowAmount, uint256 durationDays) external payable {
        (uint256 interestRate, uint256 maxBorrow) = getLoanTerms(msg.sender);
        require(borrowAmount <= maxBorrow, "Amount exceeds max borrow for your score");
        require(msg.value >= borrowAmount / 2, "Insufficient collateral (50% minimum)");

        uint256 loanId = nextLoanId++;
        loans[loanId] = Loan({
            borrower: msg.sender,
            principal: borrowAmount,
            interestRate: interestRate,
            collateral: msg.value,
            startTime: block.timestamp,
            duration: durationDays * 1 days,
            repaid: false
        });

        emit LoanIssued(loanId, msg.sender, borrowAmount, interestRate, msg.value);
    }

    /**
     * @dev Repay a loan. Returns collateral + charges interest.
     */
    function repay(uint256 loanId) external payable {
        Loan storage loan = loans[loanId];
        require(!loan.repaid, "Loan already repaid");
        require(msg.sender == loan.borrower, "Only borrower can repay");

        uint256 interest = (loan.principal * loan.interestRate) / 10000;
        uint256 totalDue = loan.principal + interest;
        require(msg.value >= totalDue, "Insufficient repayment");

        loan.repaid = true;
        emit LoanRepaid(loanId, msg.sender, totalDue);
    }

    function getLoan(uint256 loanId) external view returns (address borrower, uint256 principal, uint256 interestRate, uint256 collateral, uint256 startTime, uint256 duration, bool repaid) {
        Loan storage loan = loans[loanId];
        return (loan.borrower, loan.principal, loan.interestRate, loan.collateral, loan.startTime, loan.duration, loan.repaid);
    }

    function getLoanCount() external view returns (uint256) {
        return nextLoanId;
    }
}
