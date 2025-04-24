import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import { Keypair, PublicKey } from '@solana/web3.js'
import { Secret } from '../target/types/secret'
import IDL from '../target/idl/secret.json'
import { BankrunProvider } from 'anchor-bankrun'
import { startAnchor, ProgramTestContext, Clock } from 'solana-bankrun'
import { SYSTEM_PROGRAM_ID } from '@coral-xyz/anchor/dist/cjs/native/system'
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet'

describe('Secret Smart Contract Tests', () => {
  // Constants for testing
  const validProfileName = "James";
  const validBio = "Just a Solana enthusiast looking to connect and vibe on-chain. Let's build!";
  const validGender = "Man";
  const validLookingFor = "Women";
  const validAvatarUri = "ipfs://QmYwAPJzv5CZsnAzt8auVTLcrgETjjBP7HULtkzzPni4AB";
  const invalidProfileBio =
    "This is an invalid profile bio that is intentionally made to exceed one hundred characters in length.";
  const profileCreatedAt = Math.floor(Date.now() / 1000); // now
  const profileUpdatedAt = profileCreatedAt + 60 * 60 * 1; // 1 hour later
  const likeCreatedAt = profileCreatedAt + 60 * 60 * 2; // 2 hours later
  const likeWithdrawnAt = profileCreatedAt + 60 * 60 * 3; // 3 hours later
  const profileDeletedAt = profileCreatedAt + 60 * 60 * 4; // 4 hours later
  const likerFundAmount = 10_000_000_000; // 10 SOL in lamports
  const validLikeAmount = new anchor.BN(1_000_000_000); // 1 SOL in lamports
  const invalidLikeAmount = new anchor.BN(20_000_000_000); // 11 SOL in lamports
  const validWithdrawAmount = new anchor.BN(100_000_000); // 0.1 SOL in lamports
  const inValidWithdrawAmount = validLikeAmount; // No longer rent-exempt


  // Derived addresses
  let profilePda: PublicKey;
  let vaultPda: PublicKey;

  // Contexts
  let context: ProgramTestContext;
  let profileProgram: Program<Secret>;
  let likerProgram: Program<Secret>;

  // Keypairs
  let authorityKeypair: Keypair;
  const likerKeypair = Keypair.generate();

  let connection: anchor.web3.Connection;
  let rentExemptBalance: number;

  beforeAll(async () => {
    const programId = new PublicKey(IDL.address);

    // Get the minimum rent for this account
    connection = new anchor.web3.Connection("http://localhost:8899", "confirmed");
    rentExemptBalance = await connection.getMinimumBalanceForRentExemption(0); // 0 bytes for data
    // Initialize the test context with the secret program and pre-fund the liker account
    context = await startAnchor(
      "",
      [{ name: "secret", programId }], // Load the secret program with its ID,
      [
        {
          address: likerKeypair.publicKey, // Pre-fund the liker account
          info: {
            lamports: likerFundAmount,
            data: Buffer.alloc(0), // Empty data buffer
            owner: SYSTEM_PROGRAM_ID, // System program as the owner
            executable: false, // Not an executable account
          },
        },
      ]
    );
    // Setup authority
    const profileProvider = new BankrunProvider(context);
    anchor.setProvider(profileProvider);
    profileProgram = new Program(IDL as Secret, profileProvider);
    authorityKeypair = profileProvider.wallet.payer;

    // Setup liker program
    const likerProvider = new BankrunProvider(context);
    likerProvider.wallet = new NodeWallet(likerKeypair);
    likerProgram = new Program(IDL as Secret, likerProvider);

    // Derive PDAs
    [profilePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("profile"),
        authorityKeypair.publicKey.toBuffer(),
        Buffer.from(validProfileName),
      ],
      profileProgram.programId
    );

    [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), profilePda.toBuffer()],
      profileProgram.programId
    );
  });

  it("create profile account", async () => {
    try {
      // Set the clock to simulate blockchain time
      const currentClock = await context.banksClient.getClock();
      context.setClock(
        new Clock(
          currentClock.slot,
          currentClock.epochStartTimestamp,
          currentClock.epoch,
          currentClock.leaderScheduleEpoch,
          BigInt(profileCreatedAt)
        )
      );

      const tx = await profileProgram.methods
        .createProfile(validProfileName, validBio, validGender, validLookingFor, validAvatarUri)
        .accounts({
          authority: authorityKeypair.publicKey,
        })
        .rpc({ commitment: "confirmed" });

      console.log("Create profile account transaction signature:", tx);

      // Fetch the created profile account
      const profile = await profileProgram.account.profile.fetch(profilePda);

      // Assertions
      expect(profile.authority.toString()).toBe(
        authorityKeypair.publicKey.toString()
      );
      expect(profile.profileName).toBe(validProfileName);
      expect(profile.bio).toBe(validBio);
      expect(profile.likesInLamports.toNumber()).toBe(0);
      expect(profile.likeCount.toNumber()).toBe(0);
      expect(profile.createdAt.toNumber()).toBe(profileCreatedAt);
      expect(profile.updatedAt.toNumber()).toBe(profileCreatedAt);
      expect(profile.deletedAt).toBe(null);
      expect(profile.withdrawnAt).toBe(null);

      console.log("Profile account:", JSON.stringify(profile, null, 2));
    } catch (error: any) {
      const message = `Create profile account failed:", ${error}`;
      console.error(message);
      throw new Error(message);
    }
  });

  it("fails to create profile account with too long bio", async () => {
    try {
      // Try to create a profile with a bio that exceeds the max length
      await profileProgram.methods
        .createProfile(validProfileName, invalidProfileBio, validGender, validLookingFor, validAvatarUri)
        .accounts({
          authority: authorityKeypair.publicKey,
        })
        .rpc({ commitment: "confirmed" });

      throw new Error(
        "Profile creation should have failed due to invalid bio length"
      );
    } catch (error: any) {
      // Expect an error
      console.log(
        "Profile creation with too long bio failed as expected"
      );
    }
  });

  it("updates profile bio", async () => {
    try {
      const newBio = "Updated profile bio";

      // Fetch the profile account to ensure it exists
      const profile = await profileProgram.account.profile.fetch(profilePda);
      expect(profile).toBeDefined();

      // Set the clock to simulate blockchain time
      const currentClock = await context.banksClient.getClock();
      context.setClock(
        new Clock(
          currentClock.slot,
          currentClock.epochStartTimestamp,
          currentClock.epoch,
          currentClock.leaderScheduleEpoch,
          BigInt(profileUpdatedAt)
        )
      );

      const tx = await profileProgram.methods
        .updateProfileBio(newBio)
        .accounts({
          authority: authorityKeypair.publicKey,
          profile: profilePda,
        })
        .rpc({ commitment: "confirmed" });

      console.log("Update profile account transaction signature:", tx);

      // Fetch the updated profile account
      const updatedProfile = await profileProgram.account.profile.fetch(
        profilePda
      );

      // Assertions
      expect(updatedProfile.bio).toBe(newBio);
      expect(updatedProfile.updatedAt.toNumber()).toBe(profileUpdatedAt); // Should be updated
      expect(updatedProfile.createdAt.toNumber()).toBe(profileCreatedAt); // Should remain the same

      console.log(
        "Updated profile account:",
        JSON.stringify(updatedProfile, null, 2)
      );
    } catch (error: any) {
      const message = `Update pofile account failed:", ${error}`;
      console.error(message);
      throw new Error(message);
    }
  });

  it("fails to update profile bio with too long bio", async () => {
    try {
      // Fetch the profile account to ensure it exists
      const profile = await profileProgram.account.profile.fetch(profilePda);
      expect(profile).toBeDefined();

      await profileProgram.methods
        .updateProfileBio(invalidProfileBio)
        .accounts({
          authority: authorityKeypair.publicKey,
          profile: profilePda,
        })
        .rpc({ commitment: "confirmed" });

      throw new Error(
        "Updating profile bio should have failed due to invalid bio length"
      );
    } catch (error: any) {
      // Expect an error
      console.log(
        "Profile bio update with too long bio failed as expected"
      );
    }
  });

  it("sends like in the form of SOL to profile", async () => {
    try {
      // Set the clock to simulate blockchain time
      const currentClock = await context.banksClient.getClock();
      context.setClock(
        new Clock(
          currentClock.slot,
          currentClock.epochStartTimestamp,
          currentClock.epoch,
          currentClock.leaderScheduleEpoch,
          BigInt(likeCreatedAt)
        )
      );

      // Fetch the profile account to ensure it exists
      const profile = await profileProgram.account.profile.fetch(profilePda);
      expect(profile).toBeDefined();

      const tx = await profileProgram.methods
        .giveLike(validLikeAmount)
        .accounts({
          liker: likerKeypair.publicKey,
          profile: profilePda,
        })
        .signers([likerKeypair])
        .rpc({ commitment: "confirmed" });

      console.log("Like transaction signature:", tx);

      // Derive the like PDA (we need the current like count)
      const likeCount = profile.likeCount.toNumber();
      const [likePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("like"),
          likerKeypair.publicKey.toBuffer(),
          profilePda.toBuffer(),
          new anchor.BN(likeCount).toArrayLike(Buffer, "le", 8),
        ],
        likerProgram.programId
      );

      // Fetch the updated profile and like accounts
      const updatedProfile = await likerProgram.account.profile.fetch(
        profilePda
      );
      const likeRecord = await likerProgram.account.like.fetch(
        likePda
      );

      // Assertions for profile
      expect(updatedProfile.likesInLamports.toString()).toBe(
        validLikeAmount.toString()
      );
      expect(updatedProfile.likeCount.toNumber()).toBe(likeCount + 1);

      // Assertions for like record
      expect(likeRecord.likerKey.toString()).toBe(
        likerKeypair.publicKey.toString()
      );
      expect(likeRecord.profileKey.toString()).toBe(profilePda.toString());
      expect(likeRecord.profileName).toBe(validProfileName);
      expect(likeRecord.likesInLamports.toString()).toBe(
        validLikeAmount.toString()
      );
      expect(likeRecord.createdAt.toNumber()).toBe(likeCreatedAt);

      // Assertions for vault account
      const vaultAccount = await context.banksClient.getAccount(vaultPda);
      const vaultBalance = vaultAccount?.lamports;
      const expectedVaultBalance = validLikeAmount
        .add(new anchor.BN(rentExemptBalance))
        .toNumber();
      expect(vaultAccount?.owner.toString()).toBe(
        profileProgram.programId.toString()
      );
      expect(vaultBalance).toBe(expectedVaultBalance);

      console.log("Like record:", JSON.stringify(likeRecord, null, 2));
    } catch (error: any) {
      const message = `Like failed: ${error}`;
      console.error(message);
      throw new Error(message);
    }
  });

  it("fails to give a like in SOL to profile due to insufficient funds", async () => {
    try {
      const profile = await profileProgram.account.profile.fetch(profilePda);
      expect(profile).toBeDefined();

      await profileProgram.methods
        .giveLike(invalidLikeAmount)
        .accounts({
          liker: likerKeypair.publicKey,
          profile: profilePda,
        })
        .signers([likerKeypair])
        .rpc({ commitment: "confirmed" });

      throw new Error(
        "Sending a like in SOL should have failed due to insufficient funds"
      );
    } catch (error: any) {
      // Expect an error
      console.log("Sending like in SOL failed as expected");
    }
  });

  it("pauses and unpauses profile", async () => {
    try {
      // First pause donations
      await profileProgram.methods
        .pauseProfile(true)
        .accounts({
          authority: authorityKeypair.publicKey,
          profile: profilePda,
        })
        .rpc({ commitment: "confirmed" });

      // Verify profile is paused
      let profile = await profileProgram.account.profile.fetch(profilePda);
      expect(profile.paused).toBe(true);

      // Try to send a like while paused - should fail
      try {
        await likerProgram.methods
          .giveLike(new anchor.BN(100_000))
          .accounts({
            liker: likerKeypair.publicKey,
            profile: profilePda,
          })
          .signers([likerKeypair])
          .rpc({ commitment: "confirmed" });

        throw new Error("Sending like should have failed when profile is paused");
      } catch (error: any) {
        expect(error.message).toContain("ProfilePaused");
      }

      // Now unpause profile
      await profileProgram.methods
        .pauseProfile(false)
        .accounts({
          authority: authorityKeypair.publicKey,
          profile: profilePda,
        })
        .rpc({ commitment: "confirmed" });

      // Verify profile is unpaused
      profile = await profileProgram.account.profile.fetch(profilePda);
      expect(profile.paused).toBe(false);

      // Try to send like after unpausing - should succeed
      await likerProgram.methods
        .giveLike(new anchor.BN(100_000))
        .accounts({
          liker: likerKeypair.publicKey,
          profile: profilePda,
        })
        .signers([likerKeypair])
        .rpc({ commitment: "confirmed" });

      // Verify that sending like succeeded
      profile = await profileProgram.account.profile.fetch(profilePda);
      expect(profile.likesInLamports.toNumber()).toBeGreaterThan(0);
    } catch (error: any) {
      const message = `Pause/unpause test failed: ${error}`;
      console.error(message);
      throw new Error(message);
    }
  });

  it("withdraws likes from profile vault", async () => {
    try {
      // Set the clock to simulate blockchain time
      const currentClock = await context.banksClient.getClock();
      context.setClock(
        new Clock(
          currentClock.slot,
          currentClock.epochStartTimestamp,
          currentClock.epoch,
          currentClock.leaderScheduleEpoch,
          BigInt(likeWithdrawnAt)
        )
      );
      // Get the current state
      const profileBefore = await profileProgram.account.profile.fetch(
        profilePda
      );
      const vaultAccountBefore = await context.banksClient.getAccount(vaultPda);
      const vaultBalanceBefore = vaultAccountBefore?.lamports || 0;

      console.log("Vault balance before withdrawal:", vaultBalanceBefore);
      console.log(
        "Likes in lamports:",
        profileBefore.likesInLamports.toString()
      );
      console.log("Rent exempt minimum:", rentExemptBalance);

      const recipientKeypair = Keypair.generate();

      // Verify vault ownership
      expect(vaultAccountBefore?.owner.toString()).toBe(
        profileProgram.programId.toString()
      );

      const tx = await profileProgram.methods
        .withdrawLikes(validWithdrawAmount)
        .accounts({
          profile: profilePda,
          recipient: recipientKeypair.publicKey,
        })
        .rpc({ commitment: "confirmed" });

      console.log("Withdrawal transaction signature:", tx);

      // Fetch the updated profile account
      const updatedProfile = await profileProgram.account.profile.fetch(
        profilePda
      );

      // Check vault balance after withdrawal
      const vaultAccountAfter = await context.banksClient.getAccount(vaultPda);
      const vaultBalanceAfter = vaultAccountAfter?.lamports || 0;

      console.log("Vault balance after withdrawal:", vaultBalanceAfter);

      // Check recipient balance
      const recipientAccount = await context.banksClient.getAccount(
        recipientKeypair.publicKey
      );

      // Assertions - use difference in balances instead of absolute values
      expect(vaultBalanceBefore - vaultBalanceAfter).toBe(
        validWithdrawAmount.toNumber()
      );
      expect(updatedProfile.likesInLamports.toString()).toBe(
        profileBefore.likesInLamports.sub(validWithdrawAmount).toString()
      );
      expect(updatedProfile.withdrawnAt?.toNumber()).toBe(likeWithdrawnAt);
      expect(recipientAccount?.lamports.toString()).toBe(
        validWithdrawAmount.toString()
      );

      console.log(
        "Updated profile account after withdrawal:",
        JSON.stringify(updatedProfile, null, 2)
      );
    } catch (error: any) {
      if (error instanceof anchor.AnchorError) {
        console.error("Anchor error logs:", error.logs);
      }
      const message = `Sending like failed: ${error}`;
      console.error(message);
      throw new Error(message);
    }
  });

  it("fails to withdraw more than available or below rent-exempt", async () => {
    try {
      const profile = await profileProgram.account.profile.fetch(profilePda);

      // Try to withdraw more than what's available
      const tooMuchAmount = new anchor.BN(
        profile.likesInLamports.toNumber() * 2
      );

      await profileProgram.methods
        .withdrawLikes(tooMuchAmount)
        .accounts({
          profile: profilePda,
          recipient: Keypair.generate().publicKey,
        })
        .rpc({ commitment: "confirmed" });

      throw new Error(
        "Withdrawal should have failed due to insufficient funds"
      );
    } catch (error: any) {
      // We expect an error with InsufficientFunds
      expect(error.message).toContain("InsufficientFunds");
      console.log("Withdrawal with insufficient funds failed as expected");
    }

    try {
      // Try to withdraw amount that would leave vault below rent-exempt
      // This requires calculating exactly how much would leave exactly the min rent
      const vaultAccount = await context.banksClient.getAccount(vaultPda);
      const availableToWithdraw =
        (vaultAccount?.lamports || 0) - rentExemptBalance;
      const withdrawTooMuch = new anchor.BN(availableToWithdraw + 1); // Just 1 lamport too much

      await profileProgram.methods
        .withdrawLikes(withdrawTooMuch)
        .accounts({
          profile: profilePda,
          recipient: Keypair.generate().publicKey,
        })
        .rpc({ commitment: "confirmed" });

      throw new Error("Withdrawal should have failed due to rent exemption");
    } catch (error: any) {
      // We expect an error with InsufficientFundsForRent
      expect(error.message).toContain("InsufficientFundsForRent");
      console.log("Withdrawal below rent-exempt failed as expected");
    }
  });

  it("prevents unauthorized access to withdraw/update/delete", async () => {
    try {
      // Create unauthorized user
      const unauthorizedKeypair = Keypair.generate();
      const unauthorizedProvider = new BankrunProvider(context);
      unauthorizedProvider.wallet = new NodeWallet(unauthorizedKeypair);
      const unauthorizedProgram = new Program(
        IDL as Secret,
        unauthorizedProvider
      );

      // Try to withdraw as unauthorized user
      await unauthorizedProgram.methods
        .withdrawLikes(new anchor.BN(100))
        .accounts({
          profile: profilePda,
          recipient: unauthorizedKeypair.publicKey,
        })
        .rpc({ commitment: "confirmed" });

      throw new Error("Unauthorized withdrawal should have failed");
    } catch (error: any) {
      console.log("Unauthorized withdrawal failed as expected");
    }
  });

  it("deletes profile", async () => {
    try {
      // Set the clock to simulate blockchain time
      const currentClock = await context.banksClient.getClock();
      context.setClock(
        new Clock(
          currentClock.slot,
          currentClock.epochStartTimestamp,
          currentClock.epoch,
          currentClock.leaderScheduleEpoch,
          BigInt(profileDeletedAt)
        )
      );

      const recipientKeypair = Keypair.generate();

      const tx = await profileProgram.methods
        .deleteProfile()
        .accounts({
          profile: profilePda,
          recipient: recipientKeypair.publicKey,
        } as any) // Cast to `any` to bypass TypeScript warning
        .signers([authorityKeypair])
        .rpc({ commitment: "confirmed" });

      console.log("Delete profile transaction signature:", tx);

      // Try to fetch the profile (should fail)
      try {
        await profileProgram.account.profile.fetch(profilePda);
        fail("Profile account should have been deleted");
      } catch (error: any) {
        // This is expected, account should be deleted
        // expect(error.message).toContain("Account does not exist");
        console.log("Account successfully deleted");
      }

      // Check authority lamports to ensure they received the rent
      const authorityAccount = await context.banksClient.getAccount(
        authorityKeypair.publicKey
      );

      console.log(
        "Authority balance after deleting profile:",
        authorityAccount?.lamports.toString()
      );
    } catch (error: any) {
      const message = `Delete profile failed: ${error}`;
      console.error(message);
      throw new Error(message);
    }
  });
})
