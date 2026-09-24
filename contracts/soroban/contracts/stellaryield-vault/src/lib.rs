#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env, Symbol};

const BPS_DENOMINATOR: i128 = 10_000;
const MAX_FEE_BPS: i128 = 1_000;

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct VaultConfig {
    pub admin: Address,
    pub treasury: Address,
    pub fee_bps: i128,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Config,
    Balance(Address, Address),
}

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

fn require_positive(amount: i128) {
    if amount <= 0 {
        panic!("amount must be positive");
    }
}

fn require_valid_fee(fee_bps: i128) {
    if fee_bps < 0 || fee_bps > MAX_FEE_BPS {
        panic!("fee is outside the allowed range");
    }
}

fn config(env: &Env) -> VaultConfig {
    env.storage()
        .instance()
        .get(&DataKey::Config)
        .expect("vault is not initialized")
}

fn balance_key(user: &Address, token_address: &Address) -> DataKey {
    DataKey::Balance(user.clone(), token_address.clone())
}

fn balance_of(env: &Env, user: &Address, token_address: &Address) -> i128 {
    env.storage()
        .persistent()
        .get(&balance_key(user, token_address))
        .unwrap_or(0)
}

fn set_balance(env: &Env, user: &Address, token_address: &Address, amount: i128) {
    env.storage()
        .persistent()
        .set(&balance_key(user, token_address), &amount);
}

#[contractimpl]
impl StellarYieldVault {
    /// Must be called by the deployment admin before the Vault accepts deposits.
    pub fn initialize(env: Env, admin: Address, treasury: Address, fee_bps: i128) {
        if env.storage().instance().has(&DataKey::Config) {
            panic!("vault is already initialized");
        }
        admin.require_auth();
        require_valid_fee(fee_bps);
        env.storage().instance().set(
            &DataKey::Config,
            &VaultConfig { admin, treasury, fee_bps },
        );
    }

    /// Only the configured admin can change the fixed withdrawal destination or fee.
    pub fn update_config(env: Env, treasury: Address, fee_bps: i128) {
        let mut current = config(&env);
        current.admin.require_auth();
        require_valid_fee(fee_bps);
        current.treasury = treasury;
        current.fee_bps = fee_bps;
        env.storage().instance().set(&DataKey::Config, &current);
    }

    pub fn balance(env: Env, user: Address, token_address: Address) -> i128 {
        balance_of(&env, &user, &token_address)
    }

    /// Credits a positive deposit to the depositor's own user/token balance.
    pub fn deposit(env: Env, from: Address, token_address: Address, amount: i128) {
        let _ = config(&env);
        from.require_auth();
        require_positive(amount);

        let current_balance = balance_of(&env, &from, &token_address);
        let next_balance = current_balance.checked_add(amount).expect("balance overflow");
        // All state rolls back if the token transfer fails.
        set_balance(&env, &from, &token_address, next_balance);

        let client = token::Client::new(&env, &token_address);
        let contract_address = env.current_contract_address();
        client.transfer(&from, &contract_address, &amount);
        env.events().publish(
            (Symbol::new(&env, "deposit"), from),
            (token_address, amount),
        );
    }

    /// Withdraws only the caller's own credited balance. Callers cannot select
    /// the treasury or fee rate.
    pub fn withdraw(env: Env, user: Address, token_address: Address, amount: i128) {
        let current_config = config(&env);
        user.require_auth();
        require_positive(amount);

        let current_balance = balance_of(&env, &user, &token_address);
        if amount > current_balance {
            panic!("insufficient deposited balance");
        }

        let fee_amount = amount.checked_mul(current_config.fee_bps).expect("fee overflow") / BPS_DENOMINATOR;
        let user_amount = amount.checked_sub(fee_amount).expect("fee exceeds amount");
        set_balance(&env, &user, &token_address, current_balance - amount);

        let client = token::Client::new(&env, &token_address);
        let contract_address = env.current_contract_address();
        if fee_amount > 0 {
            client.transfer(&contract_address, &current_config.treasury, &fee_amount);
        }
        client.transfer(&contract_address, &user, &user_amount);
        env.events().publish(
            (Symbol::new(&env, "withdraw"), user),
            (user_amount, fee_amount, current_config.treasury),
        );
    }

    /// Informational event only; it cannot move funds or affect balances.
    pub fn record_recommendation(
        env: Env,
        user: Address,
        asset: Address,
        amount: i128,
        risk_profile: Symbol,
    ) -> RecommendationRecord {
        user.require_auth();
        require_positive(amount);
        let record = RecommendationRecord {
            user: user.clone(),
            asset,
            amount,
            risk_profile,
            timestamp: env.ledger().timestamp(),
        };
        env.events().publish(
            (Symbol::new(&env, "ai_recommendation"), user),
            record.clone(),
        );
        record
    }
}

#[cfg(test)]
mod test;
