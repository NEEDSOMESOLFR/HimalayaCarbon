use anchor_lang::prelude::*;

#[account]
pub struct Registry {
    pub authority: Pubkey,
    pub verifier: Pubkey,
    pub project_count: u64,
    pub bump: u8,
}

impl Registry {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        32 + // verifier
        8 +  // project_count
        1;   // bump
}

#[account]
pub struct Project {
    pub id: u64,
    pub owner: Pubkey,
    pub name: String,
    pub category: u8,
    pub province: u8,
    pub metadata_uri: String,
    pub metadata_hash: [u8; 32],
    pub status: u8,
    pub requested_capacity: u64,
    pub verified_capacity: u64,
    pub credits_minted: u64,
    pub credits_retired: u64,
    pub retirement_count: u64,
    pub price_lamports: u64,
    pub mint: Pubkey,
    pub vault: Pubkey,
    pub created_at: i64,
    pub verified_at: i64,
    pub bump: u8,
}

impl Project {
    pub const MAX_NAME_LEN: usize = 48;
    pub const MAX_METADATA_URI_LEN: usize = 128;

    pub const LEN: usize = 8 +   // discriminator
        8 +                      // id
        32 +                     // owner
        (4 + Self::MAX_NAME_LEN) + // name
        1 +                      // category
        1 +                      // province
        (4 + Self::MAX_METADATA_URI_LEN) + // metadata_uri
        32 +                     // metadata_hash
        1 +                      // status
        8 +                      // requested_capacity
        8 +                      // verified_capacity
        8 +                      // credits_minted
        8 +                      // credits_retired
        8 +                      // retirement_count
        8 +                      // price_lamports
        32 +                     // mint
        32 +                     // vault
        8 +                      // created_at
        8 +                      // verified_at
        1;                       // bump
}

pub const STATUS_PENDING: u8 = 0;
pub const STATUS_VERIFIED: u8 = 1;
pub const STATUS_REJECTED: u8 = 2;

#[account]
pub struct Retirement {
    pub project: Pubkey,
    pub retirer: Pubkey,
    pub amount: u64,
    pub beneficiary: String,
    pub reason: String,
    pub timestamp: i64,
    pub index: u64,
    pub bump: u8,
}

impl Retirement {
    pub const MAX_BENEFICIARY_LEN: usize = 48;
    pub const MAX_REASON_LEN: usize = 96;

    pub const LEN: usize = 8 +   // discriminator
        32 +                     // project
        32 +                     // retirer
        8 +                      // amount
        (4 + Self::MAX_BENEFICIARY_LEN) + // beneficiary
        (4 + Self::MAX_REASON_LEN) +      // reason
        8 +                      // timestamp
        8 +                      // index
        1;                       // bump
}
