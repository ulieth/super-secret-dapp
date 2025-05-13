use anchor_lang::prelude::*;

use crate::state::Profile;
use crate::state::*;
use crate::common::constants::*;

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct GiveLike<'info> {
    #[account(mut)]
    pub liker: Signer<'info>,

    #[account(mut)]
    pub profile: Account<'info, Profile>,

    #[account(
        mut,
        seeds = [b"vault", profile.key().as_ref()],
        bump
    )]
    /// CHECK: Safe because it's a PDA with known seeds and only receives SOL via system program
    pub vault: UncheckedAccount<'info>,

    /// Likes account to keep track of history
    #[account(
      init,
      payer = liker,
      space = ANCHOR_DISCRIMINATOR_SIZE + Like::INIT_SPACE,
      seeds = [b"like", liker.key().as_ref(), profile.key().as_ref(),  &profile.like_count.to_le_bytes()],
      bump
    )]
    pub like: Account<'info, Like>,

    pub system_program: Program<'info, System>
}
