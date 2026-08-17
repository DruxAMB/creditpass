// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title CreditPass
 * @dev Core contract on Creditcoin that verifies cross-chain repayment proofs
 * via the Attestcoin Protocol's BlockProver precompile and updates credit scores.
 *
 * The BlockProver precompile is at 0x0000000000000000000000000000000000000FD2
 * The ChainInfo precompile is at 0x0000000000000000000000000000000000000fd3
 */
interface IBlockProver {
    function verifyBlock(uint256 chainKey, bytes calldata blockHeader) external view returns (bool);
    function verifyTransaction(
        uint256 chainKey,
        bytes calldata blockHeader,
        bytes calldata proof,
        bytes calldata txData
    ) external view returns (bool);
}

interface IChainInfo {
    function getChainInfo(uint256 chainKey) external view returns (bytes memory);
}

contract CreditPass {
    // Attestcoin Protocol precompiles on Creditcoin testnet
    IBlockProver public constant BLOCK_PROVER = IBlockProver(0x0000000000000000000000000000000000000FD2);
    IChainInfo public constant CHAIN_INFO = IChainInfo(0x0000000000000000000000000000000000000fD3);

    // Sepolia chain key on Creditcoin testnet
    uint256 public constant SEPOLIA_CHAIN_KEY = 1;

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
    }

    mapping(address => CreditScore) public creditScores;
    mapping(address => RepaymentRecord[]) public repaymentHistory;
    mapping(bytes32 => bool) public verifiedTxHashes;

    // Score tiers
    uint256 public constant TIER_NONE = 0;
    uint256 public constant TIER_BRONZE = 300;
    uint256 public constant TIER_SILVER = 600;
    uint256 public constant TIER_GOLD = 750;
    uint256 public constant TIER_PLATINUM = 900;

    event CreditScoreUpdated(address indexed borrower, uint256 newScore, uint256 verifiedRepayments);
    event RepaymentVerified(address indexed borrower, uint256 loanId, uint256 amount, bytes32 txHash);

    /**
     * @dev Verify a repayment transaction from Sepolia using the Attestcoin Protocol.
     * @param blockHeader The block header of the Sepolia block containing the tx
     * @param proof The Merkle proof for the transaction
     * @param txData The raw transaction data to verify
     * @param loanId The loan ID being repaid
     * @param borrower The borrower address
     * @param amount The repayment amount
     * @param txHash The transaction hash (for dedup)
     */
    function verifyRepayment(
        bytes calldata blockHeader,
        bytes calldata proof,
        bytes calldata txData,
        uint256 loanId,
        address borrower,
        uint256 amount,
        bytes32 txHash
    ) external {
        // Dedup: prevent same tx from being verified twice
        require(!verifiedTxHashes[txHash], "Transaction already verified");

        // Verify the transaction via Attestcoin Protocol BlockProver precompile
        bool verified = BLOCK_PROVER.verifyTransaction(
            SEPOLIA_CHAIN_KEY,
            blockHeader,
            proof,
            txData
        );
        require(verified, "Attestcoin Protocol verification failed");

        // Mark as verified
        verifiedTxHashes[txHash] = true;

        // Record the repayment
        repaymentHistory[borrower].push(RepaymentRecord({
            loanId: loanId,
            borrower: borrower,
            amount: amount,
            timestamp: block.timestamp,
            txHash: txHash
        }));

        // Update credit score
        CreditScore storage score = creditScores[borrower];
        score.verifiedRepayments += 1;
        score.totalVerifiedAmount += amount;
        score.score = calculateScore(score.verifiedRepayments, score.totalVerifiedAmount);
        score.lastUpdated = block.timestamp;

        emit RepaymentVerified(borrower, loanId, amount, txHash);
        emit CreditScoreUpdated(borrower, score.score, score.verifiedRepayments);
    }

    /**
     * @dev Calculate credit score based on verified repayment history.
     * Simple linear formula: base + (repayments * weight) + (amount / divisor)
     */
    function calculateScore(uint256 repayments, uint256 totalAmount) public pure returns (uint256) {
        uint256 base = 300; // Starting score after first verification
        uint256 repaymentBonus = repayments * 100;
        uint256 amountBonus = totalAmount / 1e16; // Scale based on ETH amounts
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

    function getRepaymentRecord(address borrower, uint256 index) external view returns (uint256 loanId, address borrowerAddr, uint256 amount, uint256 timestamp, bytes32 txHash) {
        RepaymentRecord storage r = repaymentHistory[borrower][index];
        return (r.loanId, r.borrower, r.amount, r.timestamp, r.txHash);
    }

    function getScoreTier(uint256 score) public pure returns (string memory) {
        if (score >= TIER_PLATINUM) return "Platinum";
        if (score >= TIER_GOLD) return "Gold";
        if (score >= TIER_SILVER) return "Silver";
        if (score >= TIER_BRONZE) return "Bronze";
        return "No History";
    }
}
