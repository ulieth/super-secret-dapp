use anchor_lang::prelude::*;

use crate::common::constants::*;

#[account]
#[derive(InitSpace, Debug)]
pub struct Profile {
    pub authority: Pubkey, // Wallet controlling the user profile
    #[max_len(PROFILE_NAME_MAX_LEN)]
    pub profile_name: String,
    #[max_len(BIO_MAX_LEN)]
    pub bio: String,
    #[max_len(GENDER_MAX_LEN)]
    pub gender: String,
    #[max_len(LOOKING_FOR_MAX_LEN)]
    pub looking_for: String, // Match preference
    #[max_len(AVATAR_URI_MAX_LEN)]
    pub avatar_uri: String, // IPFS link
    pub like_count: u64, // Number of likes received
    pub likes_in_lamports: u64, // Running total of SOL received (in lamports)
    pub created_at: i64, // When profile was created
    pub updated_at: i64, // When profile was updated
    pub paused: bool, // Reject new matches
    pub deleted_at: Option<i64>, // When profile was deleted
    pub withdrawn_at: Option<i64>, // When likes were withdrawn
    pub vault_bump: u8, // Reference to associated vault PDA
}
