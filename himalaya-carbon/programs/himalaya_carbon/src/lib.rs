use anchor_lang::prelude::*;

pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("HimaCarb11111111111111111111111111111111111");

#[program]
pub mod himalaya_carbon {
    use super::*;

    pub fn initialize_registry(ctx: Context<InitializeRegistry>, verifier: Pubkey) -> Result<()> {
        instructions::initialize_registry::handler(ctx, verifier)
    }

    pub fn register_project(
        ctx: Context<RegisterProject>,
        name: String,
        category: u8,
        province: u8,
        metadata_uri: String,
        metadata_hash: [u8; 32],
        requested_capacity: u64,
        price_lamports: u64,
    ) -> Result<()> {
        instructions::register_project::handler(
            ctx,
            name,
            category,
            province,
            metadata_uri,
            metadata_hash,
            requested_capacity,
            price_lamports,
        )
    }

    pub fn verify_project(ctx: Context<VerifyProject>, verified_capacity: u64) -> Result<()> {
        instructions::verify_project::handler(ctx, verified_capacity)
    }

    pub fn reject_project(ctx: Context<RejectProject>) -> Result<()> {
        instructions::reject_project::handler(ctx)
    }

    pub fn mint_credits(ctx: Context<MintCredits>, amount: u64) -> Result<()> {
        instructions::mint_credits::handler(ctx, amount)
    }

    pub fn update_price(ctx: Context<UpdatePrice>, new_price_lamports: u64) -> Result<()> {
        instructions::update_price::handler(ctx, new_price_lamports)
    }

    pub fn buy_credits(ctx: Context<BuyCredits>, amount: u64) -> Result<()> {
        instructions::buy_credits::handler(ctx, amount)
    }

    pub fn retire_credits(
        ctx: Context<RetireCredits>,
        amount: u64,
        beneficiary: String,
        reason: String,
    ) -> Result<()> {
        instructions::retire_credits::handler(ctx, amount, beneficiary, reason)
    }
}
