use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount};
use crate::errors::HimalayaError;
use crate::events::CreditsMinted;
use crate::state::{Project, STATUS_VERIFIED};

#[derive(Accounts)]
pub struct MintCredits<'info> {
    #[account(
        mut,
        seeds = [b"project", project.id.to_le_bytes().as_ref()],
        bump = project.bump,
        has_one = owner @ HimalayaError::Unauthorized,
        has_one = mint @ HimalayaError::Unauthorized,
        has_one = vault @ HimalayaError::Unauthorized
    )]
    pub project: Account<'info, Project>,

    #[account(mut)]
    pub credit_mint: Account<'info, Mint>,

    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,

    pub owner: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<MintCredits>, amount: u64) -> Result<()> {
    let project = &mut ctx.accounts.project;

    require!(project.status == STATUS_VERIFIED, HimalayaError::InvalidStatus);
    require!(amount > 0, HimalayaError::InvalidAmount);

    let new_total = project
        .credits_minted
        .checked_add(amount)
        .ok_or(HimalayaError::MathOverflow)?;

    require!(
        new_total <= project.verified_capacity,
        HimalayaError::CapacityExceeded
    );

    let project_id_bytes = project.id.to_le_bytes();
    let project_seeds: &[&[u8]] = &[
        b"project",
        project_id_bytes.as_ref(),
        &[project.bump],
    ];
    let signer = &[project_seeds];

    let cpi_accounts = MintTo {
        mint: ctx.accounts.credit_mint.to_account_info(),
        to: ctx.accounts.vault.to_account_info(),
        authority: project.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
        signer,
    );
    token::mint_to(cpi_ctx, amount)?;

    project.credits_minted = new_total;

    emit!(CreditsMinted {
        id: project.id,
        project: project.key(),
        amount,
        total_minted: new_total,
    });

    Ok(())
}
