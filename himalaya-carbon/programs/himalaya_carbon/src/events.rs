use anchor_lang::prelude::*;

#[event]
pub struct ProjectRegistered {
    pub id: u64,
    pub owner: Pubkey,
    pub name: String,
    pub category: u8,
    pub province: u8,
    pub requested_capacity: u64,
    pub price_lamports: u64,
}

#[event]
pub struct ProjectVerified {
    pub id: u64,
    pub project: Pubkey,
    pub verified_capacity: u64,
    pub verified_at: i64,
}

#[event]
pub struct ProjectRejected {
    pub id: u64,
    pub project: Pubkey,
}

#[event]
pub struct CreditsMinted {
    pub id: u64,
    pub project: Pubkey,
    pub amount: u64,
    pub total_minted: u64,
}

#[event]
pub struct PriceUpdated {
    pub id: u64,
    pub project: Pubkey,
    pub old_price: u64,
    pub new_price: u64,
}

#[event]
pub struct CreditsPurchased {
    pub project: Pubkey,
    pub buyer: Pubkey,
    pub amount: u64,
    pub total_lamports: u64,
}

#[event]
pub struct CreditsRetired {
    pub project: Pubkey,
    pub retirer: Pubkey,
    pub amount: u64,
    pub beneficiary: String,
    pub reason: String,
    pub index: u64,
}
