use anchor_lang::prelude::*;
use crate::errors::HimalayaError;
use crate::events::PriceUpdated;
use crate::state::Project;

#[derive(Accounts)]
pub struct UpdatePrice<'info> {
    #[account(
        mut,
        seeds = [b"project", project.id.to_le_bytes().as_ref()],
        bump = project.bump,
        has_one = owner @ HimalayaError::Unauthorized
    )]
    pub project: Account<'info, Project>,

    pub owner: Signer<'info>,
}

pub fn handler(ctx: Context<UpdatePrice>, new_price_lamports: u64) -> Result<()> {
    require!(new_price_lamports > 0, HimalayaError::InvalidAmount);

    let project = &mut ctx.accounts.project;
    let old_price = project.price_lamports;
    project.price_lamports = new_price_lamports;

    emit!(PriceUpdated {
        id: project.id,
        project: project.key(),
        old_price,
        new_price: new_price_lamports,
    });

    Ok(())
}
