# StellarYield AI

AI-assisted DeFi experience built on Stellar.

## Concept

StellarYield AI is a Stellar-native dApp that analyzes lending
markets and provides recommendations to users.

The AI does not control user funds.

AI recommends.
The user decides.
The wallet signs.
Stellar executes.

The AI Advisor is an informational layer only. It consumes market data and a
user-selected risk profile to produce an explainable recommendation. It never
accesses wallet keys, requests a signature, constructs transactions, or moves
funds.

## Stack

- Stellar Testnet
- Soroban / Rust
- XOXNO
- React
- TypeScript
- Node.js
- AI Advisor
- Docker
- Docker Compose

## AI Advisor

The Advisor is implemented as a deterministic, explainable API. It evaluates a
server-side market snapshot against a user-selected risk profile and returns a
recommendation or an explicit `not_recommended` response. It never accepts wallet
secrets, transaction payloads or signatures.

See [the Advisor API guide](docs/advisor-api.md) for local setup, endpoints and
security controls, and [the Persona 3 plan](docs/persona-3-plan.md) for the demo
and product requirements.

## Project Structure

```text
apps/
  web/              Frontend
  api/              Backend/API

contracts/
  soroban/          Soroban contracts

packages/
  shared/           Shared types

docs/
  architecture.md
  persona-3-plan.md  AI Advisor, product and demo plan

docker/
  Docker configuration
```
