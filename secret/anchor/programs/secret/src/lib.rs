#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_instruction;
pub mod constants;
pub use constants::*;

declare_id!("coUnmi3oBUtwtd9fjeAvSsJssXh5A5xyPbhpewyzRVF");

#[program]
pub mod secret {
    use super::*;
    pub fn initialize_profile(
      ctx: Context<InitializeProfile>,
      username: String,
      bio: String,
      gender: String,
      interests: String,
      looking_for: String,
      avatar_uri: String,
    ) -> Result<()> {



      let current_time = Clock::get()?.unix_timestamp;

      // Ensure the vault PDA is owned by the program
      require_keys_eq!(ctx.accounts.vault.owner, ctx.program_id, CustomError::Unauthorized);

      Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeProfile<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = ANCHOR_DISCRIMINATOR_SIZE + User::INIT_SPACE,
        seeds = [b"user", authority.key().as_ref()],
        bump
    )]
    user: Account<'info, User>,
    /// The vault that will hold SOL for each received like.
    /// Why we use a separate vault:
    /// - Solana accounts must remain **rent-exempt** to persist.
    /// - If we store lamports directly in the `User` account and its balance drops below
    ///   the rent-exempt threshold (e.g., after a withdrawal), the account could be purged.
    /// - `User` is a data account, so mixing lamports and state increases fragility.
    /// - This vault PDA has **no custom data layout** — it's just a secure lamport holder.
    ///
    /// Design Pattern:
    /// - Keep **data and funds separate**
    /// - Store metadata in `User`
    /// - Store SOL in a **dedicated PDA vault**
    ///
    /// Why `UncheckedAccount`:
    /// - We're only transferring SOL (no deserialization required)
    /// - The vault is a PDA we derive deterministically with known seeds
    /// - Ownership checks aren't enforced because it's program-derived and safe
    /// - Minimal overhead — we just need the public key and `mut` access
    ///
    /// Safety:
    /// - This vault must be verified by seeds in the program logic
      #[account(
        init,
        payer = authority,
        space = 0, // No data, just holds lamports
        seeds = [b"vault", user.key().as_ref()],
        bump
    )]
    /// CHECK: Safe because it's a PDA with known seeds and only receives SOL via system program
    pub vault: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(liked: Pubkey)]
pub struct CreateLike<'info> {
    #[account(mut)]
    pub liker: Signer<'info>,
    #[account(
        init_if_needed,
        seeds = [b"like_vault", liker.key().as_ref()],
        bump,
        payer = liker,
        space = ANCHOR_DISCRIMINATOR_SIZE + Like::INIT_SPACE
    )]
    pub likes_vault: Account<'info, Like>,
    #[account(
        mut,
        seeds = [b"user", user.key().as_ref()],
        bump,
        has_one = authority,
    )]
    pub liker_profile: Account<'info, User>,
    pub system_program: Program<'info, System>,
}

/**
 * STATE
 */

#[account]
#[derive(InitSpace, Debug)]
pub struct User {
    pub authority: Pubkey, // Wallet controlling the user profile
    #[max_len(USERNAME_MAX_LEN)]
    pub username: String, // Profile name
    #[max_len(BIO_MAX_LEN)]
    pub bio: String, // Description of charity
    #[max_len(GENDER_MAX_LEN)]
    pub gender: String,
    #[max_len(INTERESTS_MAX_LEN)]
    pub interests: String, // Comma-separated interests
    #[max_len(LOOKING_FOR_MAX_LEN)]
    pub looking_for: String, // Match preference
    #[max_len(AVATAR_URI_MAX_LEN)]
    pub avatar_uri: String, // IPFS or Arweave link
    pub created_at: i64, // When profile was created
    pub updated_at: i64,   // When profile was updated
    pub paused: bool,      // Reject new matches
    pub deleted_at: Option<i64>, // When profile was deleted
    pub vault_bump: u8,    // Reference to associated vault PDA
}

#[account]
pub struct Like {
    pub user: Pubkey, // The owner of this vault (user profile)
    #[max_len(500)]
    pub liked: Vec<Pubkey>, // List of users this person liked
    #[max_len(500)]
    pub liked_by: Vec<Pubkey>, // List of users who liked this person
    pub status: LikeStatus, // Pending | Matched
    pub timestamp: i64, // When the like happened
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum LikeStatus {
    Pending,
    Matched,
}

/**
 * ERROR_CODES
 */
#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized access")]
    Unauthorized
}
