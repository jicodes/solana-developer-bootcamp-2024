#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

declare_id!("coUnmi3oBUtwtd9fjeAvSsJssXh5A5xyPbhpewyzRVF");

#[program]
pub mod vesting {
    use super::*;

    pub fn creating_vesting_account(ctx: Context<CreatingVesting>, company_name: String) -> Result<()> {
      *ctx.accounts.vesting_account = VestingAccount {
        owner: ctx.accounts.singer.key(),
        mint: ctx.accounts.mint.key(),
        treasury_token_account: ctx.accounts.treasury_token_account.key(),
        company_name,
        treasury_bump: ctx.bumps.treasury_token_account,
        bump: ctx.bumps.vesting_account,
      };
      Ok(())
    }

}

#[derive(Accounts)]
#[instruction(company_name: String)]
pub struct CreatingVesting<'info> {
  #[account(mut)]
  pub singer: Signer<'info>,

  #[account(
  init,
  space = 8 + VestingAccount::INIT_SPACE,
  payer = singer,
  seeds = [company_name.as_ref()],
  bump,
  )]
  pub vesting_account: Account<'info, VestingAccount>,

  pub mint: InterfaceAccount<'info, Mint>,
  
  #[account(
    init,
    token::mint = mint,
    token::authority = treasury_token_account,
    payer = singer,
    seeds = [b"vesting_treasury", company_name.as_bytes()],
    bump,
  )]
  pub treasury_token_account: InterfaceAccount<'info, TokenAccount>,
  pub system_program: Program<'info, System>,
  pub token_program: Interface<'info, TokenInterface>,
}

#[account]
#[derive(InitSpace)]
pub struct VestingAccount {
  pub owner : Pubkey,
  pub mint : Pubkey,
  pub treasury_token_account: Pubkey,
  #[max_len(50)]
  pub company_name: String,
  pub treasury_bump: u8,
  pub bump: u8,
}
