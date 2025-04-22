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
            like_count: 0,
            likes_in_lamports: 0,
            created_at: current_time,
            updated_at: current_time,
            paused: false,
            deleted_at: None,
            withdrawn_at: None,
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
            CustomError::InvalidBio
        );
        require!(
            bio.len() <= BIO_MAX_LEN,
            CustomError::InvalidBioLength
        );

        profile.bio = bio;
        profile.updated_at = current_time;

        emit!(UpdateProfileEvent {
            profile_key: profile.key(),
            profile_name: profile.profile_name.clone(),
            bio: profile.bio.clone(),
            updated_at: current_time,
        });

        Ok(())
    }

    pub fn delete_profile(ctx: Context<DeleteProfile>) -> Result<()> {
        let profile = &mut ctx.accounts.profile;
        let vault = &mut ctx.accounts.vault;
        let authority = &mut ctx.accounts.authority;
        let recipient = &mut ctx.accounts.recipient;
        let current_time = Clock::get()?.unix_timestamp;

        let (expected_vault, _vault_bump) =
            Pubkey::find_program_address(&[b"vault", profile.key().as_ref(), profile.profile_name.as_bytes()], ctx.program_id);
        require_keys_eq!(
            vault.key(),
            expected_vault,
            CustomError::InvalidVaultAccount
        );

        let vault_balance = **vault.lamports.borrow();

        if vault_balance > 0 {
            if recipient.lamports() > 0 {
                // Transfer to recipient
                **vault.lamports.borrow_mut() = vault_balance.checked_sub(vault_balance).unwrap();
                **recipient.lamports.borrow_mut() = recipient
                    .lamports()
                    .checked_add(vault_balance)
                    .ok_or(error!(CustomError::Overflow))?;
            } else {
                // Transfer to authority
                **vault.lamports.borrow_mut() = vault_balance.checked_sub(vault_balance).unwrap();
                **authority.lamports.borrow_mut() = authority
                    .lamports()
                    .checked_add(vault_balance)
                    .ok_or(error!(CustomError::Overflow))?;
              }
        }
        msg!("Profile deleted: {}", profile.profile_name);

        emit!(DeleteProfileEvent {
          profile_key: profile.key(),
          profile_name: profile.profile_name.clone(),
          deleted_at: current_time,
        });


        Ok(())

    }

    pub fn pause_profile(ctx: Context<PauseProfile>, paused: bool) -> Result<()> {
        let profile = &mut ctx.accounts.profile;
        let current_time = Clock::get()?.unix_timestamp;

        profile.paused = paused;
        profile.updated_at = current_time;

        emit!(PauseProfileEvent {
            profile_key: profile.key(),
            profile_name: profile.profile_name.clone(),
            paused,
            updated_at: current_time,
        });

        Ok(())
    }

    pub fn give_like(ctx: Context<GiveLike>, amount: u64) -> Result<()> {
        let liker = &mut ctx.accounts.liker;
        let profile = &mut ctx.accounts.profile;
        let vault = &mut ctx.accounts.vault;
        let like = &mut ctx.accounts.like;
        let current_time = Clock::get()?.unix_timestamp;

        require!(!profile.paused, CustomError::ProfilePaused);

        let (expected_vault, _vault_bump) =
            Pubkey::find_program_address(&[b"vault", profile.key().as_ref()], ctx.program_id);
        require_keys_eq!(
            vault.key(),
            expected_vault,
            CustomError::InvalidVaultAccount
        );

        // Create the transfer instruction from liker to vault PDA
        let transfer_instruction = system_instruction::transfer(liker.key, vault.key, amount);

        anchor_lang::solana_program::program::invoke(
            &transfer_instruction,
            &[
                liker.to_account_info(),
                vault.to_account_info(),
                ctx.accounts.system_program.to_account_info()
            ],
        )?;

        // Update profile state
        profile.like_count = profile
            .like_count
            .checked_add(1)
            .ok_or(error!(CustomError::Overflow))?;
        profile.likes_in_lamports = profile
            .likes_in_lamports
            .checked_add(amount)
            .ok_or(error!(CustomError::Overflow))?;

        // Record donation history
        like.liker_key = liker.key();
        like.profile_key = profile.key();
        like.profile_name = profile.profile_name.clone();
        like.likes_in_lamports = amount;
        like.created_at = current_time;

        emit!(MakeLikeEvent {
            liker_key: liker.key(),
            profile_key: profile.key(),
            profile_name: profile.profile_name.clone(),
            amount,
            created_at: current_time,
        });


        Ok(())
    }

    pub fn withdraw_likes(ctx: Context<WithdrawLikes>, amount: u64) -> Result<()> {
      let recipient = &mut ctx.accounts.recipient;
      let profile = &mut ctx.accounts.profile;
      let vault = &mut ctx.accounts.vault;
      let current_time = Clock::get()?.unix_timestamp;

      let (expected_vault, _vault_bump) =
          Pubkey::find_program_address(&[b"vault", profile.key().as_ref()], ctx.program_id);
      require_keys_eq!(
          vault.key(),
          expected_vault,
          CustomError::InvalidVaultAccount
      );

      // Ensure there are enough lamports to withdraw
      let vault_balance = **vault.lamports.borrow();
      require!(
          amount > 0 && vault_balance >= amount,
          CustomError::InsufficientFunds
      );

      let rent = Rent::get()?;
      let min_rent = rent.minimum_balance(0);

      // Ensure we maintain rent-exemption threshold
      require!(
          vault_balance.checked_sub(amount).unwrap_or(0) >= min_rent,
          CustomError::InsufficientFundsForRent
      );

      // Transfer lamports from vault to recipient via direct lamport manipulation
      // - Program-owned accounts cannot use the System Program's transfer instruction directly to send lamports.
      // - Instead, we modify the lamport balances directly.
      // - The program has authority to modify the lamport balances of accounts it owns.
      // - Total sum of lamports must remain the same before and after a transaction.
      **vault.lamports.borrow_mut() = vault_balance.checked_sub(amount).unwrap();
      **recipient.lamports.borrow_mut() = recipient
          .lamports()
          .checked_add(amount)
          .ok_or(error!(CustomError::Overflow))?;

      // Update profile state
      profile.likes_in_lamports = profile
          .likes_in_lamports
          .checked_sub(amount)
          .ok_or(error!(CustomError::Overflow))?;
      profile.withdrawn_at = Some(current_time);

      emit!(WithdrawLikesSolEvent {
          profile_key: profile.key(),
          profile_name: profile.profile_name.clone(),
          likes_in_lamports: profile.likes_in_lamports,
          like_count: profile.like_count,
          withdrawn_at: current_time,
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

#[derive(Accounts)]
pub struct DeleteProfile<'info> {
    #[account(mut)]
    authority: Signer<'info>,

    #[account(
        mut,
        close = authority,
        seeds = [b"profile", authority.key().as_ref(), profile.profile_name.as_bytes()],
        bump,
        has_one = authority,
    )]
    profile: Account<'info, Profile>,

    #[account(
        mut,
        seeds = [b"vault", profile.key().as_ref()],
        bump
    )]
    /// CHECK: Safe because it's a PDA with known seeds and only receives SOL via system program
    vault: UncheckedAccount<'info>,

    /// Destination account that will receive the withdrawn SOL
    /// Allows the profile authority to send funds to a different address than their own
    /// Why `UncheckedAccount`:
    /// - We're only transferring SOL (no deserialization required)
    /// - We're not enforcing any constraints on it through Anchor's account validation
    #[account(mut)]
    /// CHECK: Safe because it's a PDA with known seeds and only receives SOL via system program
    pub recipient: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(paused: bool)]
pub struct PauseProfile<'info> {
    #[account(mut)]
    authority: Signer<'info>,

    #[account(
      mut,
      seeds = [b"profile", authority.key().as_ref(), profile.profile_name.as_bytes()],
      bump,
      has_one = authority
    )]
    profile: Account<'info, Profile>
}

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct GiveLike<'info> {
    #[account(mut)]
    liker: Signer<'info>,

    #[account(mut)]
    profile: Account<'info, Profile>,

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

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct WithdrawLikes<'info> {
      #[account(mut)]
      pub authority: Signer<'info>,

      #[account(
          mut,
          has_one = authority
      )]
      pub profile: Account<'info, Profile>,

      #[account(
          mut,
          seeds = [b"vault", profile.key().as_ref()],
          bump
      )]
      /// CHECK: Safe because it's a PDA with known seeds and only receives SOL via system program
      pub vault: UncheckedAccount<'info>,

      /// Destination account that will receive the withdrawn SOL
      /// Allows the charity authority to send funds to a different address than their own
      /// Why `UncheckedAccount`:
      /// - We're only transferring SOL (no deserialization required)
      /// - We're not enforcing any constraints on it through Anchor's account validation
      #[account(mut)]
      /// CHECK: Safe because it's a PDA with known seeds and only receives SOL via system program
      pub recipient: UncheckedAccount<'info>,

      pub system_program: Program<'info, System>,
}

/**
 * STATE
 */
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
