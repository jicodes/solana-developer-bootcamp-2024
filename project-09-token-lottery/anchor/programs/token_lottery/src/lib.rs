#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, mint_to, MintTo, TokenAccount, TokenInterface},
};

use anchor_spl::metadata::{
    Metadata,
    create_metadata_accounts_v3, 
    CreateMetadataAccountsV3,
    mpl_token_metadata::types::{
        DataV2,
        Creator,
        CollectionDetails,
    },
    create_master_edition_v3,
    CreateMasterEditionV3,
    sign_metadata,
    SignMetadata,
    
};

declare_id!("ASnhJtoQrYMfuW1ApaRY6Cz2KP41YQ1MUorV8qcDW31A");

#[constant]
pub const NAME: &str = "Token Lottery Ticket #";
#[constant]
pub const SYMBOL: &str = "TICKET";
#[constant]
pub const URI: &str = "https://img.freepik.com/free-photo/old-used-brown-torn-ticket-stub-isolated_1101-3193.jpg";

#[program]
pub mod token_lottery {
    use super::*;

    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        start: u64,
        end: u64,
        price: u64,
    ) -> Result<()> {
        ctx.accounts.token_lottery.set_inner(TokenLottery {
            bump: ctx.bumps.token_lottery,
            winner: u64::MAX,
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

    pub fn initialize_lottery(ctx: Context<InitializeLottery>) -> Result<()> {
        // Create PDA signer seeds for collection mint
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"collection_mint".as_ref(),
            &[ctx.bumps.collection_mint],
        ]];

        // Mint one token to the collection token account
        msg!("Minting 1 token to the collection token account to represent the collection");    
        mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.collection_mint.to_account_info(),
                    to: ctx.accounts.collection_token_account.to_account_info(),
                    authority: ctx.accounts.collection_mint.to_account_info(),
                }
            ).with_signer(signer_seeds), 
            1,
        )?;

        msg!("Creating metadata account for the collection NFT");
        create_metadata_accounts_v3(
            CpiContext::new(
                ctx.accounts.token_metadata_program.to_account_info(),
                CreateMetadataAccountsV3 {
                    payer: ctx.accounts.payer.to_account_info(),
                    metadata: ctx.accounts.metadata.to_account_info(),
                    mint: ctx.accounts.collection_mint.to_account_info(),
                    mint_authority: ctx.accounts.collection_mint.to_account_info(),
                    update_authority: ctx.accounts.collection_mint.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                }
            ).with_signer(signer_seeds),
            DataV2 {
                name: NAME.to_string(),
                symbol: SYMBOL.to_string(),
                uri: URI.to_string(),
                seller_fee_basis_points: 0,
                creators: Some(vec![Creator {
                    address: ctx.accounts.collection_mint.key(),
                    verified: false, // verification initialized to false
                    share: 100,
                }]),
                collection: None,
                uses: None,
            },
            true, // is_mutable
            true, // update_authority_is_signer
            Some(CollectionDetails::V1 {size: 0}) // set collection nft with initial size 0
        )?;

        msg!("Creating master edition account"); 
        // Establishes this as the collection's master edition
        create_master_edition_v3(
            CpiContext::new(
                ctx.accounts.token_metadata_program.to_account_info(),
                CreateMasterEditionV3 {
                    payer: ctx.accounts.payer.to_account_info(),
                    metadata: ctx.accounts.metadata.to_account_info(), // Links to metadata account
                    mint: ctx.accounts.collection_mint.to_account_info(),
                    edition: ctx.accounts.master_edition.to_account_info(),
                    mint_authority: ctx.accounts.collection_mint.to_account_info(),
                    update_authority: ctx.accounts.collection_mint.to_account_info(),
                    token_program: ctx.accounts.token_program.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                }
            ).with_signer(signer_seeds),
            Some(0), // Sets max supply to 0 (fixed supply)
        )?;

        msg!("Verifying the collection");
        // Signs the metadata with creator authority to verify the collection
        sign_metadata(
            CpiContext::new(
                ctx.accounts.token_metadata_program.to_account_info(),
                SignMetadata {
                    creator: ctx.accounts.collection_mint.to_account_info(),
                    metadata: ctx.accounts.metadata.to_account_info(),
                }
            ).with_signer(signer_seeds),
        )?;
        // collection verification status changes to 'true'
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
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

#[derive(Accounts)]
pub struct InitializeLottery<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    // Collection Mint PDA
    #[account(
        init,
        payer = payer,
        mint::decimals = 0,
        mint::authority = collection_mint,
        mint::freeze_authority = collection_mint,
        seeds = [b"collection_mint".as_ref()],
        bump,
    )]
    pub collection_mint: InterfaceAccount<'info, Mint>,

    // Collection Token Account PDA
    #[account(
        init,
        payer = payer,
        token::mint = collection_mint,
        token::authority = collection_token_account,
        seeds = [b"collection_token_account".as_ref()],
        bump,
    )]
    pub collection_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [
            b"metadata", 
            token_metadata_program.key().as_ref(), 
            collection_mint.key().as_ref()
        ],
        bump,
        seeds::program = token_metadata_program.key(),
    )]
    /// CHECK: this account is checked by the metadata smart contract
    pub metadata: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [
            b"metadata", 
            token_metadata_program.key().as_ref(), 
            collection_mint.key().as_ref(),
            b"master_edition"
        ],
        bump,
        seeds::program = token_metadata_program.key(),
    )]
    /// CHECK: this account is checked by the metadata smart contract
    pub master_edition: UncheckedAccount<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub token_metadata_program: Program<'info, Metadata>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
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
