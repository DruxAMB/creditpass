# CreditPass — Cross-Chain Credit Passport

Your repayment history on Ethereum is your credit score on Creditcoin — verified cryptographically via the Attestcoin Protocol. No oracle, no intermediary.

## What It Does

CreditPass bridges Ethereum Sepolia and Creditcoin Testnet to create a trustless cross-chain credit scoring system:

1. **Borrow & Repay on Ethereum** — A borrower repays a loan on Sepolia. The transaction is recorded on-chain.
2. **Verify via Attestcoin Protocol** — The Attestcoin Protocol generates a cryptographic proof of the Sepolia transaction and verifies it on Creditcoin via the BlockProver precompile (`0x...0FD2`). No oracle required.
3. **Build Credit Score** — Each verified repayment updates the borrower's credit score on the CreditPass smart contract on Creditcoin.
4. **Borrow with Better Terms** — The CreditLender contract uses the credit score to determine interest rates and max borrow amounts. Higher score = lower rates.

## Architecture

```
Ethereum Sepolia                    Creditcoin Testnet
┌──────────────┐                   ┌──────────────────────────┐
│  LoanSource   │                   │  CreditPass              │
│  (repayments) │                   │  (credit scores)         │
└──────┬───────┘                   └──────────┬───────────────┘
       │                                      │
       │ tx hash                               │ recordRepayment()
       ▼                                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Attestcoin Protocol (USC SDK)                   │
│  ProofBuilder ──► BlockProver Precompile (0x...0FD2)        │
│  Generates Merkle proof ──► Verifies on Creditcoin chain    │
└─────────────────────────────────────────────────────────────┘
                                                              │
                                               ┌──────────────▼──────────────┐
                                               │  CreditLender               │
                                               │  (score-based loan terms)   │
                                               └─────────────────────────────┘
```

## Smart Contracts

| Contract | Chain | Address | Purpose |
|----------|-------|---------|---------|
| `LoanSource` | Sepolia | `0xb3FCCC7E689c80d49174E1F057A17C688c7aF196` | Mock lending contract with loan creation + repayment |
| `CreditPass` | Creditcoin | `0xb3FCCC7E689c80d49174E1F057A17C688c7aF196` | Records verified repayments + calculates credit scores |
| `CreditLender` | Creditcoin | `0x1A69795A4C0d957e47c240BAa8DbC1f5d91290F2` | Score-based lending with tiered interest rates |

## Tech Stack

- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS + shadcn/ui + lucide-react
- **Smart Contracts**: Solidity 0.8.24 + Hardhat 2
- **Cross-chain Verification**: `@gluwa/usc-sdk` (Attestcoin Protocol / Creditcoin Universal Smart Contract SDK)
- **Blockchain Interaction**: ethers.js v6
- **Deployment**: Vercel

## What's Real vs Mocked

### Real (on-chain, verified)
- Sepolia repayment transactions (LoanSource contract)
- Attestcoin Protocol proof generation via ProofBuilder service
- BlockProver precompile verification on Creditcoin (`verifyAndEmitSingle`)
- Credit score recording on CreditPass contract
- Credit score reading from Creditcoin in real-time
- Score-based loan terms calculation (CreditLender contract)

### Simplified for Demo
- The "Import Repayment History" button uses a pre-deployed Sepolia repayment tx
- Loan creation on CreditLender is shown in the UI but not fully wired to wallet interaction
- Single borrower address (deployer) used for demo flow

## Getting Started

### Prerequisites

- Node.js 22+
- Sepolia testnet ETH (from [Sepolia Faucet](https://sepoliafaucet.com))
- Creditcoin testnet CTC (from [Creditcoin Discord](https://discord.gg/Gu43zTfmtc))

### Installation

```bash
npm install
```

### Environment Setup

Copy `.env.example` to `.env.local` and fill in:

```env
SEED_PHRASE=your twelve word mnemonic phrase
INFURA_API_KEY=your infura api key
DEPLOYER_PRIVATE_KEY=0x... (derived from seed phrase)
LOAN_SOURCE_ADDRESS=0x...
CREDITPASS_ADDRESS=0x...
CREDIT_LENDER_ADDRESS=0x...
```

### Compile Contracts

```bash
npm run compile
```

### Deploy Contracts

```bash
# Deploy LoanSource to Sepolia (creates + repays a test loan)
npm run deploy:sepolia

# Deploy CreditPass + CreditLender to Creditcoin
npm run deploy:creditcoin
```

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo Flow

1. Open the app — credit score shows 0 (No History)
2. Click "Import Repayment History" — triggers Attestcoin Protocol verification
3. Watch the 6-step verification process in real-time
4. Credit score updates to 401 (Bronze) with 1 verified repayment
5. Loan terms improve from 20% APR → 12% APR
6. Click "Take Loan" to borrow against your credit score

## Key Innovation

The Attestcoin Protocol enables **trustless cross-chain state verification** — no bridge, no oracle, no multi-sig. The BlockProver precompile on Creditcoin cryptographically verifies that a transaction occurred on Ethereum Sepolia by checking Merkle proofs against attested block headers. This makes the credit score tamper-proof and independently verifiable.
