# StellarYield AI

> 🌐 **Español:** Puedes leer este documento en español en [README.es.md](README.es.md).

AI-assisted DeFi experience built on Stellar.

## Concept

StellarYield AI is a Stellar-native dApp that analyzes lending markets and provides explainable strategy recommendations to users.

The AI does not control user funds.

* **AI recommends.**
* **The user decides.**
* **The wallet signs.**
* **Stellar executes.**

The AI Advisor acts purely as an informational layer. It consumes real-time market data and a user-selected risk profile to produce a deterministic recommendation. It never accesses wallet keys, requests direct signatures, constructs raw transactions, or holds custody of funds.

---

## Architecture & On-Chain Integration

* **Stellar Testnet & Soroban Smart Contracts**: Vault contract (`stellaryield-vault`) deployed on-chain to record strategy recommendations and handle withdrawals with an automated 0.25% fee logic.
* **AI Advisor API**: Deterministic backend service evaluating market snapshots against risk profiles (`CONSERVATIVE`, `MODERATE`, `AGGRESSIVE`).
* **Frontend**: React + TypeScript application with web3 wallet integration (Freighter / Albedo).

### On-Chain Contract Info (Testnet)
* **Contract Name**: `stellaryield-vault`
* **Contract ID**: `CDXZ3ILDQHOLJKLSXH6F4CJ7YWXUFIUE7FBKFC3AEO6B4C3FMXQXWZOP`
* **Network**: Stellar Testnet (`https://soroban-testnet.stellar.org:443`)
* **Network Passphrase**: `"Test SDF Network ; September 2015"`

---

## Tech Stack

- **Blockchain**: Stellar Testnet, Soroban (Rust SDK)
- **Backend / API**: Node.js, TypeScript, Express (`apps/api`)
- **Frontend**: React, TypeScript, Vite (`apps/web`)
- **Integrations**: XOXNO Markets, `@stellar/stellar-sdk`
- **Infrastructure**: Docker, Docker Compose, npm Workspaces

---

## Quick Start (Local Development)

### 1. Clone & Install Dependencies
```bash
git clone [https://github.com/tu-usuario/stellaryield-ai.git](https://github.com/tu-usuario/stellaryield-ai.git)
cd stellaryield-ai
npm install