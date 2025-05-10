use anchor_lang::prelude::*;

use crate::state::Profile;
use crate::common::constants::*;

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
        seeds = [b"profile", authority.key().as_ref(), profile_name.as_bytes()],
        bump
    )]
    profile: Account<'info, Profile>,

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
        seeds = [b"vault", profile.key().as_ref()],
        bump,
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
