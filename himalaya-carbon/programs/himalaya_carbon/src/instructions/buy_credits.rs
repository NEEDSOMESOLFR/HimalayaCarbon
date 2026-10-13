use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::errors::HimalayaError;
use crate::events::CreditsPurchased;
use crate::state::{Project, STATUS_VERIFIED};

#[derive(Accounts)]
pub struct BuyCredits<'info> {
    #[account(
        mut,
        seeds = [b"project", project.id.to_le_bytes().as_ref()],
        bump = project.bump,
        has_one = vault @ HimalayaError::Unauthorized,
        has_one = owner @ HimalayaError::Unauthorized
    )]
    pub project: Account<'info, Project>,

    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,

    /// CHECK: Safe because it is verified against project.owner via has_one
    #[account(mut)]
    pub owner: AccountInfo<'info>,

    #[account(
        mut,
        constraint = buyer_token_account.mint == project.mint @ HimalayaError::Unauthorized
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub buyer: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<BuyCredits>, amount: u64) -> Result<()> {
    let project = &ctx.accounts.project;

    require!(project.status == STATUS_VERIFIED, HimalayaError::InvalidStatus);
    require!(amount > 0, HimalayaError::InvalidAmount);
    require!(
        ctx.accounts.buyer.key() != project.owner,
        HimalayaError::CannotBuyOwnCredits
    );
    require!(
        amount <= ctx.accounts.vault.amount,
        HimalayaError::InsufficientCredits
    );

    let total_lamports = amount
        .checked_mul(project.price_lamports)
        .ok_or(HimalayaError::MathOverflow)?;

    // 1. Transfer SOL buyer -> project.owner
    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        system_program::Transfer {
            from: ctx.accounts.buyer.to_account_info(),
            to: ctx.accounts.owner.to_account_info(),
        },
    );
    system_program::transfer(cpi_context, total_lamports)?;

    // 2. Transfer SPL tokens Vault -> buyer_token_account signed by Project PDA
    let project_id_bytes = project.id.to_le_bytes();
    let project_seeds: &[&[u8]] = &[
        b"project",
        project_id_bytes.as_ref(),
        &[project.bump],
    ];
    let signer = &[project_seeds];

    let cpi_accounts = Transfer {
        from: ctx.accounts.vault.to_account_info(),
        to: ctx.accounts.buyer_token_account.to_account_info(),
        authority: ctx.accounts.project.to_account_info(),
    };
    let cpi_token_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
        signer,
    );
    token::transfer(cpi_token_ctx, amount)?;

    emit!(CreditsPurchased {
        project: ctx.accounts.project.key(),
        buyer: ctx.accounts.buyer.key(),
        amount,
        total_lamports,
    });

    Ok(())
}
