#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, token, Address, Env, Symbol};

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct RecommendationRecord {
    pub user: Address,
    pub asset: Address,
    pub amount: i128,
    pub risk_profile: Symbol,
    pub timestamp: u64,
}

// Clave compuesta para almacenar el saldo por (Usuario, Token)
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Balance(Address, Address),
}

#[contract]
pub struct StellarYieldVault;

const BPS_DENOMINATOR: i128 = 10_000; // Base para cálculo porcentual (10000 = 100%)
const DEFAULT_FEE_BPS: i128 = 25;     // 0.25% de comisión de retiro

#[contractimpl]
impl StellarYieldVault {
    /// Consulta el saldo registrado de un usuario para un token específico
    pub fn get_balance(env: Env, user: Address, token_address: Address) -> i128 {
        let key = DataKey::Balance(user, token_address);
        env.storage().persistent().get(&key).unwrap_or(0)
    }

    /// 1. Realiza el depósito (Supply) y actualiza el saldo del usuario en storage
    pub fn deposit(
        env: Env,
        from: Address,
        token_address: Address,
        amount: i128,
    ) {
        if amount <= 0 {
            panic!("El monto a depositar debe ser mayor a 0");
        }

        // Requiere firma y autorización del usuario
        from.require_auth();

        let client = token::Client::new(&env, &token_address);
        let contract_address = env.current_contract_address();

        // Transferir los tokens del usuario hacia este contrato Vault
        client.transfer(&from, &contract_address, &amount);

        // Actualizar el saldo persistente del usuario
        let key = DataKey::Balance(from.clone(), token_address.clone());
        let current_balance: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        let new_balance = current_balance
            .checked_add(amount)
            .expect("Overflo/Exceso en el saldo");

        env.storage().persistent().set(&key, &new_balance);

        // Emitir evento de depósito en Stellar
        env.events().publish(
            (symbol_short!("deposit"), from),
            (token_address, amount),
        );
    }

    /// 2. Registra de forma inmutable la recomendación emitida por la IA
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
            (symbol_short!("ai_rec"), user),
            record.clone(),
        );

        record
    }

    /// 3. Realiza el retiro validando el saldo depositado del usuario
    pub fn withdraw(
        env: Env,
        user: Address,
        token_address: Address,
        amount: i128,
        treasury: Address,
    ) {
        if amount <= 0 {
            panic!("El monto a retirar debe ser mayor a 0");
        }

        user.require_auth();

        // 1. Verificar y validar saldo depositado por el usuario
        let key = DataKey::Balance(user.clone(), token_address.clone());
        let current_balance: i128 = env.storage().persistent().get(&key).unwrap_or(0);

        if amount > current_balance {
            panic!("Saldo insuficiente depositado en el Vault");
        }

        // 2. Calcular comisiones y montos finales
        let fee_amount = (amount * DEFAULT_FEE_BPS) / BPS_DENOMINATOR;
        let user_amount = amount - fee_amount;

        // 3. Descontar saldo y actualizar en storage
        let new_balance = current_balance - amount;
        env.storage().persistent().set(&key, &new_balance);

        let client = token::Client::new(&env, &token_address);
        let contract_address = env.current_contract_address();

        // 4. Transferir comisión a Tesorería (si aplica)
        if fee_amount > 0 {
            client.transfer(&contract_address, &treasury, &fee_amount);
        }

        // 5. Transferir remanente al usuario
        client.transfer(&contract_address, &user, &user_amount);

        // 6. Emitir evento de Retiro
        env.events().publish(
            (symbol_short!("withdraw"), user),
            (user_amount, fee_amount, treasury),
        );
    }
}