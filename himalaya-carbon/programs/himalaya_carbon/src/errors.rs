use anchor_lang::prelude::*;

#[error_code]
pub enum HimalayaError {
    #[msg("Signer is not authorized to perform this action")]
    Unauthorized,

    #[msg("Project status is invalid for this operation")]
    InvalidStatus,

    #[msg("Mint amount would exceed approved verified capacity")]
    CapacityExceeded,

    #[msg("Insufficient credits available in vault or wallet")]
    InsufficientCredits,

    #[msg("Amount must be greater than zero")]
    InvalidAmount,

    #[msg("Input string exceeds maximum allowable length")]
    StringTooLong,

    #[msg("Mathematical calculation caused an overflow")]
    MathOverflow,

    #[msg("Invalid project category (must be 0=Hydropower, 1=Forestry, 2=Biogas)")]
    InvalidCategory,

    #[msg("Invalid Nepal province code (must be between 0 and 5)")]
    InvalidProvince,

    #[msg("Project owner cannot purchase their own listed credits")]
    CannotBuyOwnCredits,
}
