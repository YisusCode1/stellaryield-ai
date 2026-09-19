# Architecture

## High Level

User
  ↓
StellarYield AI Web
  ↓
API
  ├── XOXNO
  └── AI Advisor

The Advisor reads normalized market data and returns an explanatory
recommendation only. It has no wallet or transaction capability.

```text
XOXNO markets → API → AI Advisor → recommendation → user review
                                                       ↓
                                                wallet signature
                                                       ↓
                                        Stellar Testnet / XOXNO Supply
```

See [Persona 3 plan](persona-3-plan.md) for the market-data contract, safety
rules and the demo sequence.
