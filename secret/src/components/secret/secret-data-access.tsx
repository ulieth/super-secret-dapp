'use client'

import { getSecretProgram, getSecretProgramId } from '@project/anchor'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { Cluster, Keypair, PublicKey } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import toast from 'react-hot-toast'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../ui/ui-layout'

export interface CreateProfileArgs {
  profile_name: string,
  bio: string,
  gender: string,
  looking_for: string,
  avatar_uri: string,
}

export interface UpdateProfileBioArgs {
  bio: string
}

export function useSecretProgram() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const programId = useMemo(() => getSecretProgramId(cluster.network as Cluster), [cluster])
  const program = useMemo(() => getSecretProgram(provider, programId), [provider, programId])
  const { publicKey } = useWallet();

  const accounts = useQuery({
    queryKey: ['profile', 'all', { cluster }],
    queryFn: () => program.account.profile.all(),
  })

  const getProgramAccount = useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  })

  const createProfile = useMutation<string, Error, CreateProfileArgs>({
    mutationKey: ['profile', 'create', { cluster }],
    mutationFn: async ({profile_name, bio, gender, looking_for, avatar_uri}) => {
      if (!publicKey) throw new Error("Wallet not connected")
      return await program.methods
        .createProfile(profile_name, bio, gender, looking_for, avatar_uri)
        .accounts({ authority: publicKey })
        .rpc();
    },
    onSuccess: (signature) => {
      transactionToast(signature)
      return accounts.refetch()
    },
    onError: () => toast.error('Failed to create profile account'),
  })

  const updateProfileBio = useMutation<string, Error, UpdateProfileBioArgs>({
    mutationKey: ['profile', 'update', { cluster }],
    mutationFn: async ({bio}) => {
      if (!publicKey) throw new Error("Wallet not connected")
      return await program.methods
        .updateProfileBio(bio)
        .accounts({ authority: publicKey })
        .rpc();
    },
    onSuccess: (signature) => {
      transactionToast(signature)
      return accounts.refetch()
    },
    onError: () => toast.error('Failed to update profile bio'),
  })

  return {
    program,
    programId,
    accounts,
    getProgramAccount,
    createProfile,
  }
}

export function useSecretProgramAccount({ account }: { account: PublicKey }) {
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const { program, accounts } = useSecretProgram()

  const accountQuery = useQuery({
    queryKey: ['profile', 'fetch', { cluster, account }],
    queryFn: () => program.account.profile.fetch(account),
  })

}
