#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env, Symbol};

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct RecommendationRecord {
    pub user: Address,
    pub asset: Address,
    pub amount: i128,
    pub risk_profile: Symbol,
    pub timestamp: u64,
}

#[contract]
pub struct StellarYieldVault;

const BPS_DENOMINATOR: i128 = 10_000; // Base para cálculo porcentual (10000 = 100%)
const DEFAULT_FEE_BPS: i128 = 25;     // 25 BPS = 0.25% de comisión al retiro

#[contractimpl]
impl StellarYieldVault {
    /// Registra de forma inmutable la recomendación emitida por la IA
    pub fn record_recommendation(
        env: Env,
        user: Address,
        asset: Address,
        amount: i128,
        risk_profile: Symbol,
    ) -> RecommendationRecord {
        user.require_auth();

        let record = RecommendationRecord {
            user: user.clone(),
            asset,
            amount,
            risk_profile,
            timestamp: env.ledger().timestamp(),
        };

        // Emitir evento de auditoría en Stellar
        env.events().publish(
            (Symbol::new(&env, "ai_recommendation"), user),
            record.clone(),
        );

        record
    }

    /// Realiza el retiro descontando el Withdraw Fee (0.25%) hacia la Tesorería
    pub fn withdraw(
        env: Env,
        user: Address,
        token_address: Address,
        amount: i128,
        treasury: Address,
        fee_bps: Option<i128>,
    ) {
        user.require_auth();

        let fee_rate = fee_bps.unwrap_or(DEFAULT_FEE_BPS);
        let fee_amount = (amount * fee_rate) / BPS_DENOMINATOR;
        let user_amount = amount - fee_amount;

        let client = token::Client::new(&env, &token_address);
        let contract_address = env.current_contract_address();

        // 1. Transferir comisión a la billetera de Tesorería del proyecto
        if fee_amount > 0 {
            client.transfer(&contract_address, &treasury, &fee_amount);
        }

        // 2. Transferir el remanente (99.75%) al usuario
        client.transfer(&contract_address, &user, &user_amount);

        // 3. Emitir evento de Retiro y Fee cobrado
        env.events().publish(
            (Symbol::new(&env, "withdraw_with_fee"), user.clone()),
            (user_amount, fee_amount, treasury),
        );
    }
}
