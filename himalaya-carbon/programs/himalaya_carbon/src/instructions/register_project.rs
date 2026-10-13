use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use crate::errors::HimalayaError;
use crate::events::ProjectRegistered;
use crate::state::{Project, Registry, STATUS_PENDING};

#[derive(Accounts)]
pub struct RegisterProject<'info> {
    #[account(
        mut,
        seeds = [b"registry"],
        bump = registry.bump
    )]
    pub registry: Account<'info, Registry>,

    #[account(
        init,
        payer = owner,
        space = Project::LEN,
        seeds = [b"project", registry.project_count.to_le_bytes().as_ref()],
        bump
    )]
    pub project: Account<'info, Project>,

    #[account(
        init,
        payer = owner,
        seeds = [b"mint", project.key().as_ref()],
        bump,
        mint::decimals = 0,
        mint::authority = project
    )]
    pub credit_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = owner,
        token::mint = credit_mint,
        token::authority = project
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<RegisterProject>,
    name: String,
    category: u8,
    province: u8,
    metadata_uri: String,
    metadata_hash: [u8; 32],
    requested_capacity: u64,
    price_lamports: u64,
) -> Result<()> {
    require!(
        !name.is_empty() && name.len() <= Project::MAX_NAME_LEN,
        HimalayaError::StringTooLong
    );
    require!(
        category <= 2,
        HimalayaError::InvalidCategory
    );
    require!(
        province <= 5,
        HimalayaError::InvalidProvince
    );
    require!(
        metadata_uri.len() <= Project::MAX_METADATA_URI_LEN,
        HimalayaError::StringTooLong
    );
    require!(requested_capacity > 0, HimalayaError::InvalidAmount);
    require!(price_lamports > 0, HimalayaError::InvalidAmount);

    let project_id = ctx.accounts.registry.project_count;
    let clock = Clock::get()?;

    let project = &mut ctx.accounts.project;
    project.id = project_id;
    project.owner = ctx.accounts.owner.key();
    project.name = name.clone();
    project.category = category;
    project.province = province;
    project.metadata_uri = metadata_uri;
    project.metadata_hash = metadata_hash;
    project.status = STATUS_PENDING;
    project.requested_capacity = requested_capacity;
    project.verified_capacity = 0;
    project.credits_minted = 0;
    project.credits_retired = 0;
    project.retirement_count = 0;
    project.price_lamports = price_lamports;
    project.mint = ctx.accounts.credit_mint.key();
    project.vault = ctx.accounts.vault.key();
    project.created_at = clock.unix_timestamp;
    project.verified_at = 0;
    project.bump = ctx.bumps.project;

    let registry = &mut ctx.accounts.registry;
    registry.project_count = registry
        .project_count
        .checked_add(1)
        .ok_or(HimalayaError::MathOverflow)?;

    emit!(ProjectRegistered {
        id: project_id,
        owner: ctx.accounts.owner.key(),
        name,
        category,
        province,
        requested_capacity,
        price_lamports,
    });

    Ok(())
}
