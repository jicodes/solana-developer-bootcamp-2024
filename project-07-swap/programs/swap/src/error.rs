use anchor_lang::prelude::*;

#[error_code]
pub enum SwapError {
    #[msg("Insufficient balance for token B")]
    InsufficientBalanceB,
    #[msg("Invalid token mint")]
    InvalidMint,
    #[msg("Vault balance mismatch")]
    VaultBalanceMismatch,
}
