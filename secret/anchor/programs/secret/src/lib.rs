#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_instruction;

pub mod constants;
pub mod errors;
pub mod events;
pub use constants::*;
pub use errors::*;
pub use events::*;

declare_id!("coUnmi3oBUtwtd9fjeAvSsJssXh5A5xyPbhpewyzRVF");

#[program]
pub mod secret {
    use super::*;
    pub fn create_profile(
        ctx: Context<CreateProfile>,
        profile_name: String,
        bio: String,
        gender: String,
        looking_for: String,
        avatar_uri: String,
    ) -> Result<()> {
        // Validate input lengths
        require!(
            profile_name.len() <= PROFILE_NAME_MAX_LEN,
            CustomError::InvalidUsernameLength
        );
        require!(
            bio.len() <= BIO_MAX_LEN,
            CustomError::InvalidBioLength
        );
        require!(
            gender.len() <= GENDER_MAX_LEN,
            CustomError::InvalidGenderLength
        );
        require!(
            looking_for.len() <= LOOKING_FOR_MAX_LEN,
            CustomError::InvalidLookingForLength
        );
        require!(
            avatar_uri.len() <= AVATAR_URI_MAX_LEN,
            CustomError::InvalidAvatarURILength
        );

        let current_time = Clock::get()?.unix_timestamp;

        *ctx.accounts.profile = Profile {
            authority: ctx.accounts.authority.key(),
            profile_name,
            bio,
            gender,
            looking_for,
            avatar_uri,
            created_at: current_time,
            updated_at: current_time,
            paused: false,
            deleted_at: None,
            vault_bump: ctx.bumps.vault,
        };

        // Ensure the vault PDA is owned by the program
        require!(ctx.accounts.vault.owner == ctx.program_id, CustomError::Unauthorized);

        emit!(CreateProfileEvent {
            profile_key: ctx.accounts.profile.key(),
            profile_name: ctx.accounts.profile.profile_name.clone(),
            bio: ctx.accounts.profile.bio.clone(),
            gender: ctx.accounts.profile.gender.clone(),
            looking_for: ctx.accounts.profile.looking_for.clone(),
            created_at: current_time,
        });

        Ok(())
    }

    pub fn update_profile_bio(
        ctx: Context<UpdateProfile>,
        bio: String,
    ) -> Result<()> {
        let profile = &mut ctx.accounts.profile;
        let current_time = Clock::get()?.unix_timestamp;

        require!(
            !bio.eq(&profile.bio),
            CustomError::AlreadyUpdated
        );
        require!(
            bio.len() <= BIO_MAX_LEN,
            CustomError::InvalidBioLength
        );

        profile.bio = bio;

        emit!(UpdateProfileEvent {
            profile_key: profile.key(),
            profile_name: profile.profile_name.clone(),
            bio: profile.bio.clone(),
            updated_at: current_time,
        });

        Ok(())
    }


}

#[derive(Accounts)]
#[instruction(
    profile_name: String,
    bio: String,
    gender: String,
    looking_for: String,
    avatar_uri: String
)]
pub struct CreateProfile<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = ANCHOR_DISCRIMINATOR_SIZE + Profile::INIT_SPACE,
        seeds = [b"profile", authority.key().as_ref()],
        bump
    )]
    profile: Account<'info, Profile>,

    /// The vault that will hold SOL for each received super like.
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
        seeds = [b"vault", profile.key().as_ref()],
        bump
    )]
    /// CHECK: Safe because it's a PDA with known seeds and only receives SOL via system program
    pub vault: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(bio: String)]
pub struct UpdateProfile<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"profile", authority.key().as_ref(), profile.profile_name.as_bytes()],
        bump,
        has_one = authority,
    )]
    pub profile: Account<'info, Profile>,
}

/**
 * STATE
 */
#[account]
#[derive(InitSpace, Debug)]
pub struct Profile {
    pub authority: Pubkey, // Wallet controlling the user profile
    #[max_len(PROFILE_NAME_MAX_LEN)]
    pub profile_name: String, // Profile name
    #[max_len(BIO_MAX_LEN)]
    pub bio: String, // Description of charity
    #[max_len(GENDER_MAX_LEN)]
    pub gender: String,
    #[max_len(LOOKING_FOR_MAX_LEN)]
    pub looking_for: String, // Match preference
    #[max_len(AVATAR_URI_MAX_LEN)]
    pub avatar_uri: String, // IPFS link
    pub created_at: i64, // When profile was created
    pub updated_at: i64, // When profile was updated
    pub paused: bool, // Reject new matches
    pub deleted_at: Option<i64>, // When profile was deleted
    pub vault_bump: u8, // Reference to associated vault PDA
}
