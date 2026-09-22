# StellarYield AI

> 🌐 **Español:** Puedes leer este documento en español en [README.es.md](README.es.md).

AI-assisted DeFi yield aggregator and lending interface built on Stellar Soroban.

## Concept

StellarYield AI is a Stellar-native dApp that analyzes lending markets and provides explainable strategy recommendations to users.

The AI does not control user funds.

* **AI recommends.**
* **The user decides.**
* **The wallet signs.**
* **Stellar executes.**

The AI Advisor acts purely as an informational layer. It consumes real-time market data and a user-selected risk profile to produce deterministic recommendations. It never accesses wallet keys, requests direct signatures, constructs raw transactions, or holds custody of funds.

---

## Architecture & On-Chain Integration

* **Stellar Testnet & Soroban Smart Contracts**: Custom Vault contract (`StellarYieldVault`) integrated with custom Stellar Asset Contracts (SAC) to handle automated multi-token supply and deposit logic.
* **AI Advisor API**: Deterministic backend service evaluating market snapshots against risk profiles (`CONSERVATIVE`, `MODERATE`, `AGGRESSIVE`).
* **Frontend**: React + TypeScript application with web3 wallet integration (Freighter) and seamless XDR transaction building/deserialization.

### On-Chain Deployed Contracts (Testnet)

* **Vault Contract ID**: `CCPVJG5PAHSMUULFKV2BJ4QIEN5F7CKE3IONHFB5EZBYY4JFEW47IZGZ`
* **USDC Token (SAC) Contract ID**: `CCQRAIMWN62JBVUCKCUJFZHDKXMSBHDP7KHFOXI3HETCTJUVIXW5SX7P`
* **Issuer Account (alice)**: `GCGZQK65HHN2KCDWGWEE4O73K7JAOSRQP6LAIONCDLTDS7LWFQWEQM33`
* **Network**: Stellar Testnet (`https://soroban-testnet.stellar.org:443`)
* **Network Passphrase**: `Test SDF Network ; September 2015`

---

## Tech Stack

* **Blockchain**: Stellar Testnet, Soroban Rust SDK (`soroban-sdk`)
* **Backend / API**: Node.js, TypeScript, Express (`apps/api`)
* **Frontend**: React, TypeScript, Vite (`apps/web`)
* **Wallet / SDK**: `@stellar/stellar-sdk`, `@stellar/freighter-api`
* **Infrastructure**: Monorepo with npm Workspaces, Docker Compose

---

## Quick Start (Local Development)

### 1. Clone & Install Dependencies

```bash
git clone [https://github.com/tu-usuario/stellaryield-ai.git](https://github.com/tu-usuario/stellaryield-ai.git)
cd stellaryield-ai
npm install