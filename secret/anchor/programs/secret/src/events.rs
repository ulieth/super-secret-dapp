use anchor_lang::prelude::*;

#[event]
pub struct CreateProfileEvent {
  pub profile_key: Pubkey,
  pub profile_name: String,
  pub bio: String,
  pub gender: String,
  pub looking_for: String,
  pub created_at: i64,
}

#[event]
pub struct UpdateProfileEvent {
  pub profile_key: Pubkey,
  pub profile_name: String,
  pub bio: String,
  pub updated_at: i64,
}

#[event]
pub struct DeleteProfileEvent {
  pub profile_key: Pubkey,
  pub profile_name: String,
  pub deleted_at: i64,
}

#[event]
pub struct PauseProfileEvent {
  pub profile_key: Pubkey,
  pub profile_name: String,
  pub paused: bool,
  pub updated_at: i64,
}

#[event]
pub struct MakeLikeEvent {
  pub liker_key: Pubkey,
  pub profile_key: Pubkey,
  pub profile_name: String,
  pub amount: u64,
  pub created_at: i64,
}

#[event]
pub struct WithdrawLikesSolEvent {
  pub profile_key: Pubkey,
  pub profile_name: String,
  pub likes_in_lamports: u64,
  pub like_count: u64,
  pub withdrawn_at: i64,
}
