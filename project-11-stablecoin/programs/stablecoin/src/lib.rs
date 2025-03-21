use anchor_lang::prelude::*;

mod state;
use state::*;

mod instructions;
use instructions::*;

mod constants;
use constants::*;



declare_id!("9JGTogJJRCqLqKoKP9rSN1yMj1XyQq4VwYVzCvNjWVYQ");

#[program]
pub mod stablecoin {
    use super::*;

    pub fn initialize_config(ctx: Context<InitializeConfig>) -> Result<()> {
        process_initialize_config(ctx)
    }

    pub fn update_config(ctx: Context<UpdateConfig>, min_health_factor: u64) -> Result<()> {
        process_update_config(ctx, min_health_factor)
    }


}