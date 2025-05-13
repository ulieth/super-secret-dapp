#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_instruction;

pub mod common;
pub mod events;
pub mod state;
pub mod instructions;

use crate::common::*;
use crate::instructions::*;

pub use events::*;
use crate::state::*;

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
            Pubkey::find_program_address(&[b"vault", profile.key().as_ref()], ctx.program_id);
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
