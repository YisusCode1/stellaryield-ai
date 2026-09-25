# StellarYield Vault (Soroban)

`stellaryield-vault` is a Testnet demo Vault. It tracks balances by `(user,
token)` and only allows a user to withdraw their own credited balance. It is
**not** an XOXNO supply adapter: a deposit transfers tokens to this Vault, not
to XOXNO.

The web application now uses XOXNO's official Testnet lending contracts for
Supply and Withdraw. This Vault is therefore not required for the XOXNO demo
and must not be configured as the destination for that flow.

## Safety model

- The deployment admin initializes the treasury and a fee capped at 10%.
- Users cannot choose the treasury or fee when withdrawing.
- Deposits and withdrawals require authorization and a positive amount.
- A withdrawal cannot exceed the caller's deposited balance for that token.

## Test and deploy

From this directory, after installing Rust 1.84+ and the Stellar CLI:

```bash
cargo test -p stellaryield-vault
stellar contract build --package stellaryield-vault
```

This security change modifies the contract ABI and storage layout. Deploy a
**new** Testnet contract and call `initialize(admin, treasury, fee_bps)` before
accepting faucet deposits. Do not send funds to the previous Vault deployment.

The StellarYield web app deliberately does not read a Vault contract ID and
cannot route funds to this contract. Keeping its address in environment files
does not enable it; any independent use requires a separate audited client and
an explicit deployment process.
