import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import { Keypair } from '@solana/web3.js'
import { Secret } from '../target/types/secret'

describe('secret', () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)
  const payer = provider.wallet as anchor.Wallet

  const program = anchor.workspace.Secret as Program<Secret>

  const secretKeypair = Keypair.generate()

  it('Initialize Secret', async () => {
    await program.methods
      .initialize()
      .accounts({
        secret: secretKeypair.publicKey,
        payer: payer.publicKey,
      })
      .signers([secretKeypair])
      .rpc()

    const currentCount = await program.account.secret.fetch(secretKeypair.publicKey)

    expect(currentCount.count).toEqual(0)
  })

  it('Increment Secret', async () => {
    await program.methods.increment().accounts({ secret: secretKeypair.publicKey }).rpc()

    const currentCount = await program.account.secret.fetch(secretKeypair.publicKey)

    expect(currentCount.count).toEqual(1)
  })

  it('Increment Secret Again', async () => {
    await program.methods.increment().accounts({ secret: secretKeypair.publicKey }).rpc()

    const currentCount = await program.account.secret.fetch(secretKeypair.publicKey)

    expect(currentCount.count).toEqual(2)
  })

  it('Decrement Secret', async () => {
    await program.methods.decrement().accounts({ secret: secretKeypair.publicKey }).rpc()

    const currentCount = await program.account.secret.fetch(secretKeypair.publicKey)

    expect(currentCount.count).toEqual(1)
  })

  it('Set secret value', async () => {
    await program.methods.set(42).accounts({ secret: secretKeypair.publicKey }).rpc()

    const currentCount = await program.account.secret.fetch(secretKeypair.publicKey)

    expect(currentCount.count).toEqual(42)
  })

  it('Set close the secret account', async () => {
    await program.methods
      .close()
      .accounts({
        payer: payer.publicKey,
        secret: secretKeypair.publicKey,
      })
      .rpc()

    // The account should no longer exist, returning null.
    const userAccount = await program.account.secret.fetchNullable(secretKeypair.publicKey)
    expect(userAccount).toBeNull()
  })
})
