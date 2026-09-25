# StellarYield AI

> Español: consulta [README.es.md](README.es.md).

StellarYield AI is a non-custodial Testnet demo for discovering XOXNO lending
markets, receiving an explainable AI recommendation, and signing Supply or
Withdraw transactions with Freighter.

## Real-data guarantee

This version has no mock mode and no simulated transactions in the UI.

- The backend accepts `STELLAR_NETWORK=testnet` only; Mainnet is rejected at startup.
- Markets, rates, liquidity, positions, and activity are read from XOXNO.
- Incomplete XOXNO data causes a safe error; the app never substitutes fallback values.
- A completed modal displays a Stellar Testnet RPC hash only after a `SUCCESS` result.
- The Soroban simulation before signing is a real Testnet preflight check. It
  does not replace transaction submission or change funds.

## Demo flow

`Freighter (Testnet) → XOXNO Testnet → Supply → position → Withdraw`

- Market, position and activity data come from the XOXNO lending API.
- The frontend uses the official XOXNO SDK's `stellarTestnet` deployment and
  prepares an unsigned Soroban XDR before the wallet signs it.
- The browser never receives, stores or transmits private keys or seed phrases.
- The advisor only analyses market snapshots; it cannot sign, send or withdraw
  funds.

The legacy `StellarYieldVault` contract is not part of the XOXNO route. See
[contracts/soroban/README.md](contracts/soroban/README.md) for its limited,
standalone demo purpose.

## Requirements

- Node.js 22 or newer.
- Freighter configured for **Stellar Testnet**.
- Testnet XLM for account reserve and fees.
- A Testnet asset that is currently enabled by XOXNO. The application reads the
  supported asset, hub and spoke from XOXNO instead of relying on a hard-coded
  token contract.

Testnet tokens are for demonstrations only. A variable APY is not a guarantee
of return.

## Run locally

```powershell
npm install
Copy-Item .env.example .env
npm run dev:api
npm run dev:web
```

Open the Vite URL and connect Freighter on **Stellar Testnet**. The frontend
has no mock mode; the API must be running at `VITE_API_URL` (default
`http://localhost:3000`).

During development, the API explicitly allows `http://localhost:5173` and
`http://127.0.0.1:5173`. In production, set `ALLOWED_ORIGINS` to the frontend's
exact HTTPS origin.

The API needs access to `https://api.xoxno.com`; the browser needs Testnet
Horizon and RPC access. Never place a private key, seed phrase, or secret in
`.env`.

## Prepare a demo wallet

1. Create or import a **Testnet** account in Freighter.
2. Fund it with Testnet XLM through the [official Stellar faucet](https://developers.stellar.org/docs/learn/fundamentals/networks#testnet).
3. Obtain a Testnet asset currently shown as enabled by XOXNO.
4. Keep sufficient XLM for the account reserve and network fees.

The project does not create accounts, request seed phrases, or fund a user's wallet.

## Testnet checklist

1. Confirm Freighter displays the Test SDF Network passphrase.
2. Fund the wallet with a small amount of Testnet XLM and a supported Testnet
   asset.
3. Check that the selected market is available in the UI.
4. Supply a minimal amount, review the XDR in Freighter, and sign.
5. Wait for a `SUCCESS` transaction result and open the Testnet explorer link.
6. Refresh **Mi Portafolio** and verify the XOXNO position.
7. Use **Retirar todo** to build the official XOXNO withdrawal transaction.

If a market is unavailable, the app blocks signing. If the real Soroban
preflight fails, do not retry blindly: review the returned error, wallet balance,
and market status first.

## Verifiable demo scope

Complete verification requires a person to connect their own wallet, approve
the XDR in Freighter, and inspect the Testnet transaction hash. The repository
contains no user signature, account, or funds; it does not claim a transaction
was sent without a `SUCCESS` hash.

## Development checks

```powershell
npm run typecheck:api
npm run test:api
npm --workspace apps/web run build
```

## Security boundaries

- XOXNO transaction builders always use the SDK's `stellarTestnet` manifest;
  no UI-supplied contract address is trusted for Supply or Withdraw.
- The API validates wallet addresses before forwarding position/activity reads.
- The UI only signs prepared XDRs after Soroban simulation, then waits for a
  bounded confirmation result.
- There is no automatic trading, delegated signing, custody or access to wallet
  secrets.
