use anchor_lang::prelude::*;

#[error_code]
pub enum CustomError {
    #[msg("Unauthorized access")]
    Unauthorized,

    #[msg("Invalid username length")]
    InvalidUsernameLength,

    #[msg("Invalid bio length")]
    InvalidBioLength,

    #[msg("Invalid gender length")]
    InvalidGenderLength,

    #[msg("Invalid looking for length")]
    InvalidLookingForLength,

    #[msg("Invalid avatar URI length")]
    InvalidAvatarURILength,

    #[msg("Already updated")]
    AlreadyUpdated,
}
