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
  const likerFundAmount = 10_000_000_000; // 10 SOL in lamports

  // Derived addresses
  let profilePda: PublicKey;
  let vaultPda: PublicKey;

  // Contexts
  let context: ProgramTestContext;
  let secretProgram: Program<Secret>;
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
    const secretProvider = new BankrunProvider(context);
    anchor.setProvider(secretProvider);
    secretProgram = new Program(IDL as Secret, secretProvider);
    authorityKeypair = secretProvider.wallet.payer;

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
      secretProgram.programId
    );

    [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), profilePda.toBuffer()],
      secretProgram.programId
    );
  });

  it("create profile account", async () => {

  });
















})
