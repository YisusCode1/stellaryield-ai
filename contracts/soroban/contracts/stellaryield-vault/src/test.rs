#![cfg(test)]

use super::*;
use soroban_sdk::{token, Address, Env};

fn setup(env: &Env, fee_bps: i128) -> (Address, Address, Address, Address, Address) {
    env.mock_all_auths();

    let admin = Address::generate(env);
    let user = Address::generate(env);
    let other_user = Address::generate(env);
    let treasury = Address::generate(env);
    let vault_id = env.register(StellarYieldVault, ());
    let vault = StellarYieldVaultClient::new(env, &vault_id);
    vault.initialize(&admin, &treasury, &fee_bps);

    let token_id = env.register_stellar_asset_contract_v2(admin.clone());
    let token_admin = token::StellarAssetClient::new(env, &token_id);
    token_admin.mint(&user, &10_000);

    (vault_id, token_id, user, other_user, treasury)
}

#[test]
fn deposit_credits_only_the_depositor_and_withdraw_charges_fixed_fee() {
    let env = Env::default();
    let (vault_id, token_id, user, other_user, treasury) = setup(&env, 25);
    let vault = StellarYieldVaultClient::new(&env, &vault_id);
    let token = token::Client::new(&env, &token_id);

    vault.deposit(&user, &token_id, &4_000);
    assert_eq!(vault.balance(&user, &token_id), 4_000);
    assert_eq!(vault.balance(&other_user, &token_id), 0);
    assert_eq!(token.balance(&vault_id), 4_000);

    vault.withdraw(&user, &token_id, &2_000);

    // 25 bps of 2,000 is 5; the remaining 1,995 returns to the user.
    assert_eq!(vault.balance(&user, &token_id), 2_000);
    assert_eq!(token.balance(&treasury), 5);
    assert_eq!(token.balance(&user), 7_995);
}

#[test]
#[should_panic]
fn a_user_cannot_withdraw_another_users_deposit() {
    let env = Env::default();
    let (vault_id, token_id, user, other_user, _) = setup(&env, 25);
    let vault = StellarYieldVaultClient::new(&env, &vault_id);

    vault.deposit(&user, &token_id, &1_000);
    vault.withdraw(&other_user, &token_id, &1);
}

#[test]
#[should_panic]
fn initialization_rejects_an_invalid_fee() {
    let env = Env::default();
    let _ = setup(&env, MAX_FEE_BPS + 1);
}
