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
