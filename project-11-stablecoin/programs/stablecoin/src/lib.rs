use anchor_lang::prelude::*;

declare_id!("9JGTogJJRCqLqKoKP9rSN1yMj1XyQq4VwYVzCvNjWVYQ");

#[program]
pub mod stablecoin {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
