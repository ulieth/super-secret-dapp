// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { Cluster, PublicKey } from '@solana/web3.js'
import SecretIDL from '../target/idl/secret.json'
import type { Secret } from '../target/types/secret'

// Re-export the generated IDL and type
export { Secret, SecretIDL }

// The programId is imported from the program IDL.
export const SECRET_PROGRAM_ID = new PublicKey(SecretIDL.address)

// This is a helper function to get the Secret Anchor program.
export function getSecretProgram(provider: AnchorProvider, address?: PublicKey) {
  return new Program({ ...SecretIDL, address: address ? address.toBase58() : SecretIDL.address } as Secret, provider)
}

// This is a helper function to get the program ID for the Secret program depending on the cluster.
export function getSecretProgramId(cluster: Cluster) {
  switch (cluster) {
    case 'devnet':
    case 'testnet':
      // This is the program ID for the Secret program on devnet and testnet.
      return new PublicKey('coUnmi3oBUtwtd9fjeAvSsJssXh5A5xyPbhpewyzRVF')
    case 'mainnet-beta':
    default:
      return SECRET_PROGRAM_ID
  }
}
