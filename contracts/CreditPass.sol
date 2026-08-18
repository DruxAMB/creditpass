// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title CreditPass
 * @dev Core contract on Creditcoin that records cross-chain repayment proofs
 * verified via the Attestcoin Protocol's BlockProver precompile.
 *
 * The flow:
 * 1. Off-chain: ProofBuilder generates a proof for a Sepolia repayment tx
 * 2. On-chain: PrecompileBlockProver.verifyAndEmitSingle() verifies the proof
 *    and emits a TransactionVerified event
 * 3. Off-chain: After verification succeeds, call recordRepayment() on this contract
 *    to update the borrower's credit score
 *
 * The BlockProver precompile is at 0x0000000000000000000000000000000000000FD2
 * The ChainInfo precompile is at 0x0000000000000000000000000000000000000fD3
 */
interface ICreditPassNFT {
    function mintOrUpdate(address borrower, uint256 score, uint256 verifiedRepayments, uint256 totalVerifiedAmount, string calldata tier) external;
}

contract CreditPass {
    // Score tiers
    uint256 public constant TIER_NONE = 0;
    uint256 public constant TIER_BRONZE = 300;
    uint256 public constant TIER_SILVER = 600;
    uint256 public constant TIER_GOLD = 750;
    uint256 public constant TIER_PLATINUM = 900;

    ICreditPassNFT public nftContract;
    address public owner;

    struct CreditScore {
        uint256 score;
        uint256 verifiedRepayments;
        uint256 totalVerifiedAmount;
        uint256 lastUpdated;
    }

    struct RepaymentRecord {
        uint256 loanId;
        address borrower;
        uint256 amount;
        uint256 timestamp;
        bytes32 txHash;
        uint256 sourceChainKey;
        uint256 sourceBlockHeight;
    }

    mapping(address => CreditScore) public creditScores;
    mapping(address => RepaymentRecord[]) public repaymentHistory;
    mapping(bytes32 => bool) public verifiedTxHashes;

    event CreditScoreUpdated(address indexed borrower, uint256 newScore, uint256 verifiedRepayments);
    event RepaymentVerified(address indexed borrower, uint256 loanId, uint256 amount, bytes32 txHash, uint256 sourceChainKey, uint256 sourceBlockHeight);

    /**
     * @dev Record a repayment that has been verified via the Attestcoin Protocol.
     * This is called after verifyAndEmitSingle succeeds on the BlockProver precompile.
     * @param loanId The loan ID being repaid
     * @param borrower The borrower address
     * @param amount The repayment amount (in wei)
     * @param txHash The source chain transaction hash (for dedup)
     * @param sourceChainKey The chain key of the source chain (e.g. Sepolia)
     * @param sourceBlockHeight The block height of the verified tx on the source chain
     */
    function recordRepayment(
        uint256 loanId,
        address borrower,
        uint256 amount,
        bytes32 txHash,
        uint256 sourceChainKey,
        uint256 sourceBlockHeight
    ) external {
        // Dedup: prevent same tx from being recorded twice
        require(!verifiedTxHashes[txHash], "Transaction already verified");

        // Mark as verified
        verifiedTxHashes[txHash] = true;

        // Record the repayment
        repaymentHistory[borrower].push(RepaymentRecord({
            loanId: loanId,
            borrower: borrower,
            amount: amount,
            timestamp: block.timestamp,
            txHash: txHash,
            sourceChainKey: sourceChainKey,
            sourceBlockHeight: sourceBlockHeight
        }));

        // Update credit score
        CreditScore storage score = creditScores[borrower];
        score.verifiedRepayments += 1;
        score.totalVerifiedAmount += amount;
        score.score = calculateScore(score.verifiedRepayments, score.totalVerifiedAmount);
        score.lastUpdated = block.timestamp;

        emit RepaymentVerified(borrower, loanId, amount, txHash, sourceChainKey, sourceBlockHeight);
        emit CreditScoreUpdated(borrower, score.score, score.verifiedRepayments);

        // Mint or update soulbound NFT passport
        if (address(nftContract) != address(0)) {
            nftContract.mintOrUpdate(
                borrower,
                score.score,
                score.verifiedRepayments,
                score.totalVerifiedAmount,
                getScoreTier(score.score)
            );
        }
    }

    /**
     * @dev Calculate credit score based on verified repayment history.
     * Formula: base + (repayments * weight) + (amount / divisor), capped at 950.
     */
    function calculateScore(uint256 repayments, uint256 totalAmount) public pure returns (uint256) {
        uint256 base = 300;
        uint256 repaymentBonus = repayments * 100;
        uint256 amountBonus = totalAmount / 1e16;
        uint256 score = base + repaymentBonus + amountBonus;
        if (score > 950) score = 950;
        return score;
    }

    function getCreditScore(address borrower) external view returns (uint256 score, uint256 verifiedRepayments, uint256 totalVerifiedAmount, uint256 lastUpdated) {
        CreditScore storage cs = creditScores[borrower];
        return (cs.score, cs.verifiedRepayments, cs.totalVerifiedAmount, cs.lastUpdated);
    }

    function getRepaymentCount(address borrower) external view returns (uint256) {
        return repaymentHistory[borrower].length;
    }

    function getRepaymentRecord(address borrower, uint256 index) external view returns (
        uint256 loanId, address borrowerAddr, uint256 amount, uint256 timestamp,
        bytes32 txHash, uint256 sourceChainKey, uint256 sourceBlockHeight
    ) {
        RepaymentRecord storage r = repaymentHistory[borrower][index];
        return (r.loanId, r.borrower, r.amount, r.timestamp, r.txHash, r.sourceChainKey, r.sourceBlockHeight);
    }

    function getScoreTier(uint256 score) public pure returns (string memory) {
        if (score >= TIER_PLATINUM) return "Platinum";
        if (score >= TIER_GOLD) return "Gold";
        if (score >= TIER_SILVER) return "Silver";
        if (score >= TIER_BRONZE) return "Bronze";
        return "No History";
    }

    function setNFTContract(address _nftContract) external {
        require(msg.sender == owner, "Only owner");
        nftContract = ICreditPassNFT(_nftContract);
    }
}
