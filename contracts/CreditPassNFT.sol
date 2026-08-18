// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title CreditPassNFT
 * @dev Soulbound ERC721 that represents a borrower's credit passport.
 * Minted on first verified repayment, metadata updated on each new verification.
 * Tokens are non-transferable (soulbound) — locked to the borrower's address.
 */
contract CreditPassNFT {
    // ERC721 storage
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    mapping(uint256 => string) private _tokenURIs;

    // Credit passport data per token
    struct PassportData {
        address borrower;
        uint256 score;
        uint256 verifiedRepayments;
        uint256 totalVerifiedAmount;
        string tier;
        uint256 mintedAt;
        uint256 lastUpdated;
    }

    mapping(uint256 => PassportData) public passports;
    mapping(address => uint256) public borrowerToTokenId;
    uint256 private _nextTokenId;

    address public creditPass;
    address public owner;

    string public name = "CreditPass Credit Passport";
    string public symbol = "CPASS";

    event PassportMinted(uint256 indexed tokenId, address indexed borrower, uint256 score, string tier);
    event PassportUpdated(uint256 indexed tokenId, address indexed borrower, uint256 newScore, string tier);

    modifier onlyCreditPass() {
        require(msg.sender == creditPass, "Only CreditPass contract");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setCreditPass(address _creditPass) external onlyOwner {
        creditPass = _creditPass;
    }

    /**
     * @dev Mint or update a credit passport NFT for a borrower.
     * Called by CreditPass after each verified repayment.
     */
    function mintOrUpdate(
        address borrower,
        uint256 score,
        uint256 verifiedRepayments,
        uint256 totalVerifiedAmount,
        string calldata tier
    ) external onlyCreditPass {
        uint256 tokenId = borrowerToTokenId[borrower];

        if (tokenId == 0) {
            // Mint new token
            tokenId = ++_nextTokenId;
            _owners[tokenId] = borrower;
            _balances[borrower] += 1;
            borrowerToTokenId[borrower] = tokenId;

            passports[tokenId] = PassportData({
                borrower: borrower,
                score: score,
                verifiedRepayments: verifiedRepayments,
                totalVerifiedAmount: totalVerifiedAmount,
                tier: tier,
                mintedAt: block.timestamp,
                lastUpdated: block.timestamp
            });

            _tokenURIs[tokenId] = _buildTokenURI(tokenId, score, tier, verifiedRepayments, totalVerifiedAmount);

            emit PassportMinted(tokenId, borrower, score, tier);
        } else {
            // Update existing token
            passports[tokenId].score = score;
            passports[tokenId].verifiedRepayments = verifiedRepayments;
            passports[tokenId].totalVerifiedAmount = totalVerifiedAmount;
            passports[tokenId].tier = tier;
            passports[tokenId].lastUpdated = block.timestamp;

            _tokenURIs[tokenId] = _buildTokenURI(tokenId, score, tier, verifiedRepayments, totalVerifiedAmount);

            emit PassportUpdated(tokenId, borrower, score, tier);
        }
    }

    /**
     * @dev Build on-chain metadata (base64-encoded JSON).
     */
    function _buildTokenURI(
        uint256 tokenId,
        uint256 score,
        string calldata tier,
        uint256 verifiedRepayments,
        uint256 totalVerifiedAmount
    ) internal pure returns (string memory) {
        return string(abi.encodePacked(
            "data:application/json;utf8,{",
            "\"name\":\"CreditPass Passport #", _toString(tokenId), "\",",
            "\"description\":\"Cross-chain credit passport verified via Attestcoin Protocol\",",
            "\"attributes\":[",
            "{\"trait_type\":\"Score\",\"value\":", _toString(score), "},",
            "{\"trait_type\":\"Tier\",\"value\":\"", tier, "\"},",
            "{\"trait_type\":\"Verified Repayments\",\"value\":", _toString(verifiedRepayments), "},",
            "{\"trait_type\":\"Total Verified (wei)\",\"value\":", _toString(totalVerifiedAmount), "}",
            "]}"
        ));
    }

    // ============ ERC721 view functions ============

    function balanceOf(address account) external view returns (uint256) {
        require(account != address(0), "ERC721: zero address");
        return _balances[account];
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        address tokenOwner = _owners[tokenId];
        require(tokenOwner != address(0), "ERC721: nonexistent token");
        return tokenOwner;
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(_owners[tokenId] != address(0), "ERC721: nonexistent token");
        return _tokenURIs[tokenId];
    }

    function getPassport(address borrower) external view returns (
        uint256 tokenId, uint256 score, uint256 verifiedRepayments,
        uint256 totalVerifiedAmount, string memory tier, uint256 mintedAt, uint256 lastUpdated
    ) {
        tokenId = borrowerToTokenId[borrower];
        require(tokenId != 0, "No passport for this borrower");
        PassportData storage p = passports[tokenId];
        return (tokenId, p.score, p.verifiedRepayments, p.totalVerifiedAmount, p.tier, p.mintedAt, p.lastUpdated);
    }

    // ============ Soulbound: block all transfers ============

    function transferFrom(address, address, uint256) external pure {
        revert("Soulbound: non-transferable");
    }

    function safeTransferFrom(address, address, uint256) external pure {
        revert("Soulbound: non-transferable");
    }

    function safeTransferFrom(address, address, uint256, bytes calldata) external pure {
        revert("Soulbound: non-transferable");
    }

    function approve(address, uint256) external pure {
        revert("Soulbound: non-transferable");
    }

    function setApprovalForAll(address, bool) external pure {
        revert("Soulbound: non-transferable");
    }

    function getApproved(uint256) external pure returns (address) {
        return address(0);
    }

    function isApprovedForAll(address, address) external pure returns (bool) {
        return false;
    }

    // ============ Helpers ============

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) { digits++; temp /= 10; }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
