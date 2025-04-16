#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;

declare_id!("coUnmi3oBUtwtd9fjeAvSsJssXh5A5xyPbhpewyzRVF");

#[program]
pub mod secret {
    use super::*;
    pub fn initialize_profile(ctx: Context<InitializeProfile>) -> Result<()> {

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeProfile<'info> {
  #[account(mut)]
  pub payer: Signer<'info>,
  pub system_program: Program<'info, System>,
}
