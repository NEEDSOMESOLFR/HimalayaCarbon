use anchor_lang::prelude::*;
use crate::errors::HimalayaError;
use crate::events::ProjectVerified;
use crate::state::{Project, Registry, STATUS_PENDING, STATUS_VERIFIED};

#[derive(Accounts)]
pub struct VerifyProject<'info> {
    #[account(
        seeds = [b"registry"],
        bump = registry.bump,
        has_one = verifier @ HimalayaError::Unauthorized
    )]
    pub registry: Account<'info, Registry>,

    #[account(
        mut,
        seeds = [b"project", project.id.to_le_bytes().as_ref()],
        bump = project.bump
    )]
    pub project: Account<'info, Project>,

    pub verifier: Signer<'info>,
}

pub fn handler(ctx: Context<VerifyProject>, verified_capacity: u64) -> Result<()> {
    let project = &mut ctx.accounts.project;

    require!(
        project.status == STATUS_PENDING,
        HimalayaError::InvalidStatus
    );
    require!(
        verified_capacity > 0 && verified_capacity <= project.requested_capacity,
        HimalayaError::CapacityExceeded
    );

    let clock = Clock::get()?;
    project.status = STATUS_VERIFIED;
    project.verified_capacity = verified_capacity;
    project.verified_at = clock.unix_timestamp;

    emit!(ProjectVerified {
        id: project.id,
        project: project.key(),
        verified_capacity,
        verified_at: project.verified_at,
    });

    Ok(())
}
