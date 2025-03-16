#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

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
    set_and_verify_sized_collection_item,
    SetAndVerifySizedCollectionItem,
};

use switchboard_on_demand::accounts::RandomnessAccountData;


declare_id!("ASnhJtoQrYMfuW1ApaRY6Cz2KP41YQ1MUorV8qcDW31A");

#[constant]
pub const NAME: &str = "Token Lottery Ticket #";
#[constant]
pub const SYMBOL: &str = "TICKET";
#[constant]
pub const URI: &str = "https://github.com/solana-developers/developer-bootcamp-2024/blob/main/project-9-token-lottery/metadata.json";

#[program]
pub mod token_lottery {
    use super::*;

    pub fn create_lottery(
        ctx: Context<CreateLottery>,
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

    pub fn create_ticket_collection(ctx: Context<CreateTicketCollection>) -> Result<()> {
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
            Some(0), // Sets supply to 0 (no additional copies can be minted)
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

    pub fn buy_ticket(ctx: Context<BuyTicket>) -> Result<()> {
        let clock = Clock::get()?;
        let ticket_name = NAME.to_owned() + &ctx.accounts.token_lottery.total_tickets.to_string();
        
        if clock.slot < ctx.accounts.token_lottery.start_time || clock.slot > ctx.accounts.token_lottery.end_time {
            return Err(ErrorCode::LotteryNotOpen.into());
        }

        // Transfer the ticket price from the payer to the lottery
        transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.payer.to_account_info(),
                    to: ctx.accounts.token_lottery.to_account_info(),
                }
            ),
            ctx.accounts.token_lottery.ticket_price,
        )?;
        
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"collection_mint".as_ref(),
            &[ctx.bumps.collection_mint],
        ]];
        // Mint a ticket to the destination account
        mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.ticket_mint.to_account_info(),
                    to: ctx.accounts.destination.to_account_info(),
                    authority: ctx.accounts.collection_mint.to_account_info(),
                }
            ).with_signer(signer_seeds), 
            1,
        )?;

        // Create metadata account for the ticket NFT
        create_metadata_accounts_v3(
            CpiContext::new(
                ctx.accounts.token_metadata_program.to_account_info(),
                CreateMetadataAccountsV3 {
                    payer: ctx.accounts.payer.to_account_info(),
                    metadata: ctx.accounts.ticket_metadata.to_account_info(),
                    mint: ctx.accounts.ticket_mint.to_account_info(),
                    mint_authority: ctx.accounts.collection_mint.to_account_info(),
                    update_authority: ctx.accounts.collection_mint.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                }
            ).with_signer(signer_seeds),
            DataV2 {
                name: ticket_name,
                symbol: SYMBOL.to_string(),
                uri: URI.to_string(),
                seller_fee_basis_points: 0,
                creators: None,
                collection: None,
                uses: None,
            },
            true, // is_mutable
            true, // update_authority_is_signer
            None, // collection details
        )?;

        create_master_edition_v3(
            CpiContext::new(
                ctx.accounts.token_metadata_program.to_account_info(),
                CreateMasterEditionV3 {
                    payer: ctx.accounts.payer.to_account_info(),
                    metadata: ctx.accounts.ticket_metadata.to_account_info(),
                    mint: ctx.accounts.ticket_mint.to_account_info(),
                    edition: ctx.accounts.ticket_master_edition.to_account_info(),
                    mint_authority: ctx.accounts.collection_mint.to_account_info(),
                    update_authority: ctx.accounts.collection_mint.to_account_info(),
                    token_program: ctx.accounts.token_program.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                }
            ).with_signer(signer_seeds),
            Some(0), // Sets supply to 0 (no additional copies can be minted)
        )?;

        // Verifies the ticket NFT as part of the collection.
        set_and_verify_sized_collection_item(
            CpiContext::new(
                ctx.accounts.token_metadata_program.to_account_info(),
                SetAndVerifySizedCollectionItem {
                    payer: ctx.accounts.payer.to_account_info(),
                    metadata: ctx.accounts.ticket_metadata.to_account_info(),
                    collection_authority: ctx.accounts.collection_mint.to_account_info(),
                    update_authority: ctx.accounts.collection_mint.to_account_info(),
                    collection_mint: ctx.accounts.collection_mint.to_account_info(),
                    collection_metadata: ctx.accounts.collection_metadata.to_account_info(),
                    collection_master_edition: ctx.accounts.collection_master_edition.to_account_info(),
                }
            ).with_signer(signer_seeds),
            None,
        )?;

        ctx.accounts.token_lottery.total_tickets += 1;

        Ok(())
    }

    pub fn commit_randomness(ctx: Context<CommitRandomness>) -> Result<()> {

        let clock = Clock::get()?;
        let token_lottery = &mut ctx.accounts.token_lottery;

        if ctx.accounts.payer.key() != token_lottery.authority {
            return Err(ErrorCode::NotAuthorized.into());
        }

        let randomness_data = RandomnessAccountData::parse(
            ctx.accounts.randomness_account.data.borrow()
        ).unwrap();

        if randomness_data.seed_slot != clock.slot - 1 {
            return Err(ErrorCode::RandomnessAlreadyRevealed.into());
        }

        token_lottery.randomness_account = ctx.accounts.randomness_account.key();

        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateLottery<'info> {
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
pub struct CreateTicketCollection<'info> {
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
            b"edition"
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

#[derive(Accounts)]
pub struct BuyTicket<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"token_lottery".as_ref()],
        bump = token_lottery.bump,
    )]
    pub token_lottery: Account<'info, TokenLottery>,

    #[account(
        mut,
        seeds = [b"collection_mint".as_ref()],
        bump,
    )]
    pub collection_mint: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = payer,
        seeds = [token_lottery.total_tickets.to_le_bytes().as_ref()],
        bump,
        mint::decimals = 0, 
        mint::authority = collection_mint,
        mint::freeze_authority = collection_mint,
        mint::token_program = token_program,
    )]
    pub ticket_mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        seeds = [
            b"metadata", 
            token_metadata_program.key().as_ref(), 
            ticket_mint.key().as_ref()
        ],
        bump,
        seeds::program = token_metadata_program.key(),
    )]
    /// CHECK: this account is checked by the metadata smart contract
    pub ticket_metadata: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [
            b"metadata", 
            token_metadata_program.key().as_ref(), 
            ticket_mint.key().as_ref(),
            b"edition"
        ],
        bump,
        seeds::program = token_metadata_program.key(),
    )]
    /// CHECK: this account is checked by the metadata smart contract
    pub ticket_master_edition: UncheckedAccount<'info>,

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
    pub collection_metadata: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [
            b"metadata", 
            token_metadata_program.key().as_ref(), 
            collection_mint.key().as_ref(),
            b"edition"
        ],
        bump,
        seeds::program = token_metadata_program.key(),
    )]
    /// CHECK: this account is checked by the metadata smart contract
    pub collection_master_edition: UncheckedAccount<'info>,

    #[account(
        init,
        payer = payer,
        associated_token::mint = ticket_mint,
        associated_token::authority = payer,
        associated_token::token_program = token_program,
    )]
    pub destination: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub token_metadata_program: Program<'info, Metadata>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct CommitRandomness<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"token_lottery".as_ref()],
        bump = token_lottery.bump,
    )]
    pub token_lottery: Account<'info, TokenLottery>,

    /// CHECK: this account is checked by the Switchboard smart contract
    pub randomness_account: UncheckedAccount<'info>,

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


#[error_code]
pub enum ErrorCode {
    #[msg("Incorrect randomness account")]
    IncorrectRandomnessAccount,
    #[msg("Lottery not completed")]
    LotteryNotCompleted,
    #[msg("Lottery is not open")]
    LotteryNotOpen,
    #[msg("Not authorized")]
    NotAuthorized,
    #[msg("Randomness already revealed")]
    RandomnessAlreadyRevealed,
    #[msg("Randomness not resolved")]
    RandomnessNotResolved,
    #[msg("Winner not chosen")]
    WinnerNotChosen,
    #[msg("Winner already chosen")]
    WinnerChosen,
    #[msg("Ticket is not verified")]
    NotVerifiedTicket,
    #[msg("Incorrect ticket")]
    IncorrectTicket,
}