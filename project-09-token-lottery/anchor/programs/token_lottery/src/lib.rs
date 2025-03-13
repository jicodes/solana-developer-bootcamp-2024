#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;

declare_id!("ASnhJtoQrYMfuW1ApaRY6Cz2KP41YQ1MUorV8qcDW31A");

#[program]
pub mod token_lottery {
    use super::*;

    pub fn initialize_config(ctx: Context<Initialize>, start: u64, end: u64, price: u64) -> Result<()> {
        ctx.accounts.token_lottery.set_inner(TokenLottery {
            bump: ctx.bumps.token_lottery,
            winner: u64:MAX,
            winner_chosen: false,
            start_time: start,
            end_time: end,
            lottery_pot_amount: 0,
            total_tickets: 0,
            ticket_price: price,
            authority: ctx.accounts.payer.key(),
            randomness_account: Pubkey::default(),
        });
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        space = 8 + TokenLottery::INIT_SPACE,
        seeds = [b"token_lottery".as_ref()],
        bump
    )]
    pub token_lottery: Account<'info, TokenLottery>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct TokenLottery {
    pub bump: u8,
    pub winner: u64,
    pub winner_chosen: bool,
    pub start_time: u64,
    pub end_time: u64,
    pub lottery_pot_amount: u64,
    pub total_tickets: u64,
    pub ticket_price: u64,
    pub authority: Pubkey,
    pub randomness_account: Pubkey,
}
