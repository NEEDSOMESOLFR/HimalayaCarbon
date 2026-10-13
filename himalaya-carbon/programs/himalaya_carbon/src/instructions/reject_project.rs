use anchor_lang::prelude::*;
use crate::errors::HimalayaError;
use crate::events::ProjectRejected;
use crate::state::{Project, Registry, STATUS_PENDING, STATUS_REJECTED};

#[derive(Accounts)]
pub struct RejectProject<'info> {
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

pub fn handler(ctx: Context<RejectProject>) -> Result<()> {
    let project = &mut ctx.accounts.project;

    require!(
        project.status == STATUS_PENDING,
        HimalayaError::InvalidStatus
    );

    project.status = STATUS_REJECTED;

    emit!(ProjectRejected {
        id: project.id,
        project: project.key(),
    });

    Ok(())
}
