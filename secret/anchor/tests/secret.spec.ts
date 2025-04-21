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
  const likerFundAmount = 10_000_000_000; // 10 SOL in lamports
  const profileCreatedAt = Math.floor(Date.now() / 1000); // now
  const profileUpdatedAt = profileCreatedAt + 60 * 60 * 1; // 1 hour later
  const likeCreatedAt = profileCreatedAt + 60 * 60 * 2; // 2 hours later
  const likeWithdrawnAt = profileCreatedAt + 60 * 60 * 3; // 3 hours later
  const profileDeletedAt = profileCreatedAt + 60 * 60 * 4; // 4 hours later

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
})
