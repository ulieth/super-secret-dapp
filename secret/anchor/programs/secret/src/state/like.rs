use anchor_lang::prelude::*;

use crate::common::constants::*;

#[account]
#[derive(InitSpace, Debug)]
pub struct Like {
    pub liker_key: Pubkey, // Key of wallet that sent a like
    pub profile_key: Pubkey, // Key of profile that received a like
    #[max_len(PROFILE_NAME_MAX_LEN)]
    pub profile_name: String,
    pub likes_in_lamports: u64,
    pub created_at: i64,     // When donation was made
}
