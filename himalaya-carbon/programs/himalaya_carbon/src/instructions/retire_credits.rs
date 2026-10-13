use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, Token, TokenAccount};
use crate::errors::HimalayaError;
use crate::events::CreditsRetired;
use crate::state::{Project, Retirement};

#[derive(Accounts)]
pub struct RetireCredits<'info> {
    #[account(
        mut,
        seeds = [b"project", project.id.to_le_bytes().as_ref()],
        bump = project.bump,
        has_one = mint @ HimalayaError::Unauthorized
    )]
    pub project: Account<'info, Project>,

    #[account(mut)]
    pub credit_mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = holder_token_account.mint == project.mint @ HimalayaError::Unauthorized,
        constraint = holder_token_account.owner == retirer.key() @ HimalayaError::Unauthorized
    )]
    pub holder_token_account: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = retirer,
        space = Retirement::LEN,
        seeds = [
            b"retirement",
            project.key().as_ref(),
            project.retirement_count.to_le_bytes().as_ref()
        ],
        bump
    )]
    pub retirement: Account<'info, Retirement>,

    #[account(mut)]
    pub retirer: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<RetireCredits>,
    amount: u64,
    beneficiary: String,
    reason: String,
) -> Result<()> {
    require!(amount > 0, HimalayaError::InvalidAmount);
    require!(
        amount <= ctx.accounts.holder_token_account.amount,
        HimalayaError::InsufficientCredits
    );
    require!(
        !beneficiary.is_empty() && beneficiary.len() <= Retirement::MAX_BENEFICIARY_LEN,
        HimalayaError::StringTooLong
    );
    require!(
        !reason.is_empty() && reason.len() <= Retirement::MAX_REASON_LEN,
        HimalayaError::StringTooLong
    );

    let project = &mut ctx.accounts.project;
    let retirement_index = project.retirement_count;
    let clock = Clock::get()?;

    // Burn tokens from holder's token account
    let burn_accounts = Burn {
        mint: ctx.accounts.credit_mint.to_account_info(),
        from: ctx.accounts.holder_token_account.to_account_info(),
        authority: ctx.accounts.retirer.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        burn_accounts,
    );
    token::burn(cpi_ctx, amount)?;

    // Populate retirement account
    let retirement = &mut ctx.accounts.retirement;
    retirement.project = project.key();
    retirement.retirer = ctx.accounts.retirer.key();
    retirement.amount = amount;
    retirement.beneficiary = beneficiary.clone();
    retirement.reason = reason.clone();
    retirement.timestamp = clock.unix_timestamp;
    retirement.index = retirement_index;
    retirement.bump = ctx.bumps.retirement;

    // Update project counters
    project.retirement_count = project
        .retirement_count
        .checked_add(1)
        .ok_or(HimalayaError::MathOverflow)?;

    project.credits_retired = project
        .credits_retired
        .checked_add(amount)
        .ok_or(HimalayaError::MathOverflow)?;

    emit!(CreditsRetired {
        project: project.key(),
        retirer: ctx.accounts.retirer.key(),
        amount,
        beneficiary,
        reason,
        index: retirement_index,
    });

    Ok(())
}
